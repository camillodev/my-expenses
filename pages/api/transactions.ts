import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseClient, getSupabaseErrorResponse } from '../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // Validar Supabase
  const supabaseError = getSupabaseErrorResponse();
  if (supabaseError) {
    return res.status(500).json(supabaseError);
  }

  const supabaseResult = createSupabaseClient();
  if (!supabaseResult.isValid || !supabaseResult.client) {
    return res.status(500).json({ 
      error: 'Erro ao configurar banco de dados',
      details: supabaseResult.error
    });
  }

  const supabase = supabaseResult.client;
  
  try {
    const { itemId, accountId, limit } = req.query;

    let query = supabase
      .from('transactions')
      .select('*, accounts!inner(*)')
      .order('date', { ascending: false });

    // Filtrar por itemId se fornecido
    if (itemId) {
      query = query.eq('accounts.itemId', itemId as string);
    }

    // Filtrar por accountId se fornecido
    if (accountId) {
      query = query.eq('accountId', accountId as string);
    }

    // Limitar resultados se fornecido
    if (limit) {
      query = query.limit(parseInt(limit as string, 10));
    }

    const { data: transactions, error } = await query;

    if (error) {
      // Se tabela não existe, retornar array vazio
      if (error.code === 'PGRST205') {
        console.warn('Tabela transactions não encontrada, retornando array vazio');
        return res.status(200).json({ transactions: [] });
      }
      console.error('Error fetching transactions:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar transações',
        details: error.message 
      });
    }

    res.status(200).json({ transactions: transactions || [] });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar transações',
      details: error.message || 'Internal server error' 
    });
  }
}
