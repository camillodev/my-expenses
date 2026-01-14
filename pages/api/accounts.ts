import type { NextApiRequest, NextApiResponse } from 'next';
import { PluggyClient } from 'pluggy-sdk';
import { createClient } from '@supabase/supabase-js';

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID || '';
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const client = new PluggyClient({
    clientId: PLUGGY_CLIENT_ID,
    clientSecret: PLUGGY_CLIENT_SECRET,
  });
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
        return res.status(500).json({ error: error.message });
      }

      // Buscar informações detalhadas do Pluggy
      const accountsWithDetails = await Promise.all(
        (accounts || []).map(async (account) => {
          try {
            const accountDetails = await client.fetchAccount(account.id);
            return {
              ...account,
              name: accountDetails.name,
              type: accountDetails.type,
              subtype: accountDetails.subtype,
              balance: accountDetails.balance,
              currencyCode: accountDetails.currencyCode,
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
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .order('itemId, id');

      if (error) {
        console.error('Error fetching accounts from Supabase:', error);
      }

      // Se não houver contas no Supabase, tentar buscar diretamente do Pluggy
      let accountsToProcess = accounts || [];
      
      if (accountsToProcess.length === 0) {
        try {
          // Buscar todos os items do Pluggy
          const itemsResponse = await client.fetchItems();
          const allItems = itemsResponse.results || [];
          
          // Para cada item, buscar suas contas
          for (const item of allItems) {
            try {
              const itemAccounts = await client.fetchAccounts(item.id);
              for (const account of itemAccounts.results) {
                accountsToProcess.push({
                  id: account.id,
                  itemId: account.itemId,
                });
              }
            } catch (err) {
              console.error(`Error fetching accounts for item ${item.id}:`, err);
            }
          }
        } catch (err) {
          console.error('Error fetching items from Pluggy:', err);
        }
      }

      // Buscar detalhes de cada conta do Pluggy
      const accountsWithDetails = await Promise.all(
        accountsToProcess.map(async (account) => {
          try {
            const accountDetails = await client.fetchAccount(account.id);
            return {
              ...account,
              name: accountDetails.name,
              type: accountDetails.type,
              subtype: accountDetails.subtype,
              balance: accountDetails.balance,
              currencyCode: accountDetails.currencyCode,
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
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
