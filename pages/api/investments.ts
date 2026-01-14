import type { NextApiRequest, NextApiResponse } from 'next';
import { PluggyClient } from 'pluggy-sdk';
import { createSupabaseClient, getSupabaseErrorResponse } from '../../lib/supabase';
import { generateRequestId, logApiRequest, logApiResponse, logDataProcessing, logError } from '../../lib/debug-logger';

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID || '';
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Validar Supabase
  const supabaseError = getSupabaseErrorResponse();
  if (supabaseError) {
    logError('/api/investments', new Error('Supabase configuration error'), supabaseError, requestId);
    return res.status(500).json(supabaseError);
  }

  const supabaseResult = createSupabaseClient();
  if (!supabaseResult.isValid || !supabaseResult.client) {
    logError('/api/investments', new Error('Supabase client error'), supabaseResult.error, requestId);
    return res.status(500).json({ 
      error: 'Erro ao configurar banco de dados',
      details: supabaseResult.error
    });
  }

  const supabase = supabaseResult.client;
  const client = new PluggyClient({
    clientId: PLUGGY_CLIENT_ID,
    clientSecret: PLUGGY_CLIENT_SECRET,
  });

  try {
    const { itemId } = req.query;
    logApiRequest('/api/investments', { itemId }, requestId);

    if (!itemId || typeof itemId !== 'string') {
      logError('/api/investments', new Error('itemId is required'), { query: req.query }, requestId);
      return res.status(400).json({ 
        error: 'itemId é obrigatório',
        details: 'O itemId deve ser fornecido como query parameter'
      });
    }

    // Primeiro, tentar buscar do Supabase (contas com type='investment')
    logDataProcessing('fetchFromSupabase', { itemId }, null, requestId);
    const { data: investmentAccounts, error: supabaseError } = await supabase
      .from('accounts')
      .select('*')
      .eq('itemId', itemId)
      .eq('type', 'investment');

    if (supabaseError && supabaseError.code !== 'PGRST205') {
      logError('/api/investments', supabaseError, { step: 'fetchFromSupabase' }, requestId);
    }

    // Se encontrou investimentos no banco, retornar
    if (investmentAccounts && investmentAccounts.length > 0) {
      logDataProcessing('fetchFromSupabase', { itemId }, { count: investmentAccounts.length }, requestId);
      const duration = Date.now() - startTime;
      logApiResponse('/api/investments', { investmentsCount: investmentAccounts.length }, requestId, duration);
      return res.status(200).json({ investments: investmentAccounts });
    }

    // Se não encontrou, buscar do Pluggy
    try {
      logDataProcessing('fetchFromPluggy', { itemId }, null, requestId);
      
      // Verificar se o método fetchInvestments existe no SDK
      // Se não existir, buscar contas e filtrar por type='investment'
      let investments: any[] = [];
      
      if (typeof (client as any).fetchInvestments === 'function') {
        const investmentsResponse = await (client as any).fetchInvestments(itemId);
        investments = investmentsResponse.results || [];
      } else {
        // Fallback: buscar contas e filtrar investimentos
        const accountsResponse = await client.fetchAccounts(itemId);
        investments = (accountsResponse.results || []).filter(
          (acc: any) => acc.type === 'investment' || acc.subtype === 'investment' || 
                       acc.subtype === 'brokerage' || acc.subtype === 'mutual_fund'
        );
      }

      logDataProcessing('fetchFromPluggy', { itemId }, { count: investments.length }, requestId);

      // Salvar investimentos no banco (usando tabela accounts com type='investment')
      if (investments.length > 0) {
        const investmentsToSave = investments.map((inv: any) => ({
          id: inv.id,
          itemId: inv.itemId || itemId,
          name: inv.name || null,
          type: 'investment',
          subtype: inv.type || inv.subtype || 'investment',
          balance: inv.balance !== undefined ? inv.balance : null,
          currencyCode: inv.currencyCode || null,
        }));

        logDataProcessing('saveInvestments', { itemId, count: investmentsToSave.length }, null, requestId);
        const { error: saveError } = await supabase
          .from('accounts')
          .upsert(investmentsToSave, { onConflict: 'id' });

        if (saveError) {
          logError('/api/investments', saveError, { step: 'saveInvestments' }, requestId);
        } else {
          logDataProcessing('saveInvestments', { itemId }, { saved: investmentsToSave.length }, requestId);
        }
      }

      const duration = Date.now() - startTime;
      logApiResponse('/api/investments', { investmentsCount: investments.length }, requestId, duration);
      res.status(200).json({ investments });
    } catch (pluggyError: any) {
      // Se falhar ao buscar do Pluggy, retornar array vazio
      logError('/api/investments', pluggyError, { itemId, step: 'fetchFromPluggy' }, requestId);
      const duration = Date.now() - startTime;
      logApiResponse('/api/investments', { investmentsCount: 0 }, requestId, duration);
      res.status(200).json({ investments: [] });
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError('/api/investments', error, { itemId: req.query.itemId }, requestId);
    res.status(500).json({ 
      error: 'Erro ao buscar investimentos',
      details: error.message || 'Internal server error' 
    });
  }
}
