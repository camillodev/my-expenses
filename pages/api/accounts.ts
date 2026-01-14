import type { NextApiRequest, NextApiResponse } from 'next';
import { PluggyClient } from 'pluggy-sdk';
import { createSupabaseClient, getSupabaseErrorResponse } from '../../lib/supabase';

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID || '';
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || '';

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
  const client = new PluggyClient({
    clientId: PLUGGY_CLIENT_ID,
    clientSecret: PLUGGY_CLIENT_SECRET,
  });

  try {
    const { itemId } = req.query;

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
            
            // Extract credit card specific fields
            const creditLimit = (accountDetails as any).creditLimit || 
                               (accountDetails as any).creditData?.limit || 
                               (accountDetails as any).limit || 
                               null;
            const availableCredit = (accountDetails as any).availableCredit || 
                                   (accountDetails as any).creditData?.availableCredit || 
                                   (accountDetails as any).available || 
                                   null;

            return {
              ...account,
              name: accountDetails.name,
              type: accountDetails.type,
              subtype: accountDetails.subtype,
              balance: accountDetails.balance,
              currencyCode: accountDetails.currencyCode,
              creditLimit: creditLimit !== null && creditLimit !== undefined ? creditLimit : undefined,
              availableCredit: availableCredit !== null && availableCredit !== undefined ? availableCredit : undefined,
              // Include all fields for debugging (will be filtered later)
              _debugFullAccount: accountDetails
            };
          } catch (err) {
            console.error(`Error fetching account ${account.id}:`, err);
            return account;
          }
        })
      );

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
          return res.status(200).json({ accounts: [] });
        }
        console.error('Error fetching accounts from Supabase:', error);
        return res.status(500).json({ 
          error: 'Erro ao buscar contas',
          details: error.message 
        });
      }

      // Buscar detalhes de cada conta do Pluggy
      const accountsWithDetails = await Promise.all(
        accountsToProcess.map(async (account) => {
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
            
            // Extract credit card specific fields
            const creditLimit = (accountDetails as any).creditLimit || 
                               (accountDetails as any).creditData?.limit || 
                               (accountDetails as any).limit || 
                               null;
            const availableCredit = (accountDetails as any).availableCredit || 
                                   (accountDetails as any).creditData?.availableCredit || 
                                   (accountDetails as any).available || 
                                   null;

            return {
              ...account,
              name: accountDetails.name,
              type: accountDetails.type,
              subtype: accountDetails.subtype,
              balance: accountDetails.balance,
              currencyCode: accountDetails.currencyCode,
              creditLimit: creditLimit !== null && creditLimit !== undefined ? creditLimit : undefined,
              availableCredit: availableCredit !== null && availableCredit !== undefined ? availableCredit : undefined,
              // Include all fields for debugging (will be filtered later)
              _debugFullAccount: accountDetails
            };
          } catch (err) {
            console.error(`Error fetching account ${account.id}:`, err);
            return account;
          }
        })
      );

      res.status(200).json({ accounts: accountsWithDetails });
    }
  } catch (error: any) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar contas',
      details: error.message || 'Internal server error' 
    });
  }
}
