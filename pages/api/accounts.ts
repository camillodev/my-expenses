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
      let accounts: any[] = [];
      if (SUPABASE_URL && SUPABASE_KEY) {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('itemId', itemId as string)
          .order('id');

        if (error) {
          // Se tabela não existe, retornar array vazio
          if (error.code === 'PGRST205') {
            return res.status(200).json({ accounts: [] });
          }
          return res.status(500).json({ error: error.message });
        }
        accounts = data || [];
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
      // Buscar todas as contas do Supabase (se a tabela existir)
      let accountsToProcess: any[] = [];
      if (SUPABASE_URL && SUPABASE_KEY) {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .order('itemId, id');

        if (error) {
          // Tabela pode não existir ainda - isso é ok
          if (error.code !== 'PGRST205') {
            console.error('Error fetching accounts from Supabase:', error);
          }
        } else {
          accountsToProcess = data || [];
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
