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

    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'transactions.ts:27',message:'Before transactions query',data:{itemId,accountId,limit},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

    let query = supabase
      .from('transactions')
      .select('*, accounts!fk_transactions_account(*)')
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

    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'transactions.ts:50',message:'After transactions query',data:{hasError:!!error,errorCode:error?.code,errorMessage:error?.message,transactionsCount:transactions?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

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
