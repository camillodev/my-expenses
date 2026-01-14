import type { NextApiRequest, NextApiResponse } from 'next';
import { PluggyClient } from 'pluggy-sdk';
import { createSupabaseClient, getSupabaseErrorResponse } from '../../lib/supabase';
import { generateRequestId, logApiRequest, logApiResponse, logDataProcessing, logError } from '../../lib/debug-logger';
import { extractCreditData, isCreditCardSubtype } from '../../lib/pluggy-utils';

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
    logError('/api/accounts', new Error('Supabase configuration error'), supabaseError, requestId);
    return res.status(500).json(supabaseError);
  }

  const supabaseResult = createSupabaseClient();
  if (!supabaseResult.isValid || !supabaseResult.client) {
    logError('/api/accounts', new Error('Supabase client error'), supabaseResult.error, requestId);
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
    logApiRequest('/api/accounts', { itemId }, requestId);

    if (itemId) {
      // Buscar contas de um item específico
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('itemId', itemId as string)
        .order('id');

      if (error) {
        // Se tabela não existe, retornar array vazio
        if (error.code === 'PGRST205') {
          return res.status(200).json({ accounts: [] });
        }
        return res.status(500).json({ 
          error: 'Erro ao buscar contas',
          details: error.message 
        });
      }

      // Buscar informações detalhadas do Pluggy
      const accountsWithDetails = await Promise.all(
        (accounts || []).map(async (account) => {
          try {
            const accountDetails = await client.fetchAccount(account.id);
            
            // Debug: Log full account structure for first account of each type
            const typeKey = `${accountDetails.type || 'unknown'}_${accountDetails.subtype || 'unknown'}`;
            if (!(global as any).__debugAccountTypes) {
              (global as any).__debugAccountTypes = new Set();
            }
            if (!(global as any).__debugAccountTypes.has(typeKey)) {
              (global as any).__debugAccountTypes.add(typeKey);
              console.log(`[DEBUG] Account ${typeKey} full structure:`, JSON.stringify(accountDetails, null, 2));
            }
            
            // Extract credit card specific fields using utility function
            const creditData = extractCreditData(accountDetails);
            logDataProcessing('extractCreditData', { accountId: account.id, subtype: accountDetails.subtype }, creditData, requestId);

            return {
              ...account,
              name: accountDetails.name,
              type: accountDetails.type,
              subtype: accountDetails.subtype,
              balance: accountDetails.balance,
              currencyCode: accountDetails.currencyCode,
              creditLimit: creditData.creditLimit ?? undefined,
              availableCredit: creditData.availableCredit ?? undefined,
              currentInvoice: creditData.currentInvoice ?? undefined,
              // Include all fields for debugging (will be filtered later)
              _debugFullAccount: accountDetails
            };
          } catch (err) {
            console.error(`Error fetching account ${account.id}:`, err);
            return account;
          }
        })
      );

      const duration = Date.now() - startTime;
      logApiResponse('/api/accounts', { accountsCount: accountsWithDetails.length }, requestId, duration);
      return res.status(200).json({ accounts: accountsWithDetails });
    } else {
      // Buscar todas as contas do Supabase
      const { data: accountsToProcess, error } = await supabase
        .from('accounts')
        .select('*')
        .order('itemId, id');

      if (error) {
        // Se tabela não existe, retornar array vazio
        if (error.code === 'PGRST205') {
          const duration = Date.now() - startTime;
          logApiResponse('/api/accounts', { accountsCount: 0 }, requestId, duration);
          return res.status(200).json({ accounts: [] });
        }
        logError('/api/accounts', error, { step: 'fetchFromSupabase' }, requestId);
        return res.status(500).json({ 
          error: 'Erro ao buscar contas',
          details: error.message 
        });
      }

      logDataProcessing('fetchFromSupabase', null, { accountsCount: accountsToProcess?.length || 0 }, requestId);

      // Buscar detalhes de cada conta do Pluggy
      const accountsWithDetails = await Promise.all(
        (accountsToProcess || []).map(async (account) => {
          try {
            const accountDetails = await client.fetchAccount(account.id);
            
            // Debug: Log full account structure for first account of each type
            const typeKey = `${accountDetails.type || 'unknown'}_${accountDetails.subtype || 'unknown'}`;
            if (!(global as any).__debugAccountTypes) {
              (global as any).__debugAccountTypes = new Set();
            }
            if (!(global as any).__debugAccountTypes.has(typeKey)) {
              (global as any).__debugAccountTypes.add(typeKey);
              console.log(`[DEBUG] Account ${typeKey} full structure:`, JSON.stringify(accountDetails, null, 2));
            }
            
            // Extract credit card specific fields using utility function
            const creditData = extractCreditData(accountDetails);
            logDataProcessing('extractCreditData', { accountId: account.id, subtype: accountDetails.subtype }, creditData, requestId);

            return {
              ...account,
              name: accountDetails.name,
              type: accountDetails.type,
              subtype: accountDetails.subtype,
              balance: accountDetails.balance,
              currencyCode: accountDetails.currencyCode,
              creditLimit: creditData.creditLimit ?? undefined,
              availableCredit: creditData.availableCredit ?? undefined,
              currentInvoice: creditData.currentInvoice ?? undefined,
              // Include all fields for debugging (will be filtered later)
              _debugFullAccount: accountDetails
            };
          } catch (err: any) {
            logError('/api/accounts', err, { accountId: account.id }, requestId);
            return account;
          }
        })
      );

      const duration = Date.now() - startTime;
      logApiResponse('/api/accounts', { accountsCount: accountsWithDetails.length }, requestId, duration);
      res.status(200).json({ accounts: accountsWithDetails });
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError('/api/accounts', error, { itemId: req.query.itemId }, requestId);
    res.status(500).json({ 
      error: 'Erro ao buscar contas',
      details: error.message || 'Internal server error' 
    });
  }
}
