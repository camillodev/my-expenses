import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseClient, getSupabaseErrorResponse } from '../../lib/supabase';
import { generateRequestId, logApiRequest, logApiResponse, logDataProcessing, logError } from '../../lib/debug-logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Validar Supabase
  const supabaseError = getSupabaseErrorResponse();
  if (supabaseError) {
    logError('/api/transactions', new Error('Supabase configuration error'), supabaseError, requestId);
    return res.status(500).json(supabaseError);
  }

  const supabaseResult = createSupabaseClient();
  if (!supabaseResult.isValid || !supabaseResult.client) {
    logError('/api/transactions', new Error('Supabase client error'), supabaseResult.error, requestId);
    return res.status(500).json({ 
      error: 'Erro ao configurar banco de dados',
      details: supabaseResult.error
    });
  }

  const supabase = supabaseResult.client;
  
  try {
    const { itemId, accountId, limit } = req.query;
    logApiRequest('/api/transactions', { itemId, accountId, limit }, requestId);

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

    logDataProcessing('fetchTransactions', { itemId, accountId, limit }, null, requestId);
    const { data: transactions, error } = await query;

    if (error) {
      // Se tabela não existe, retornar array vazio
      if (error.code === 'PGRST205') {
        const duration = Date.now() - startTime;
        logApiResponse('/api/transactions', { transactionsCount: 0 }, requestId, duration);
        return res.status(200).json({ transactions: [] });
      }
      logError('/api/transactions', error, { itemId, accountId, limit }, requestId);
      return res.status(500).json({ 
        error: 'Erro ao buscar transações',
        details: error.message 
      });
    }

    logDataProcessing('fetchTransactions', { itemId, accountId, limit }, { transactionsCount: transactions?.length || 0 }, requestId);
    const duration = Date.now() - startTime;
    logApiResponse('/api/transactions', { transactionsCount: transactions?.length || 0 }, requestId, duration);
    res.status(200).json({ transactions: transactions || [] });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError('/api/transactions', error, { itemId: req.query.itemId, accountId: req.query.accountId }, requestId);
    res.status(500).json({ 
      error: 'Erro ao buscar transações',
      details: error.message || 'Internal server error' 
    });
  }
}
