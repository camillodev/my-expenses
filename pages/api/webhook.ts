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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new PluggyClient({
    clientId: PLUGGY_CLIENT_ID,
    clientSecret: PLUGGY_CLIENT_SECRET,
  });
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const { itemId, type } = req.body;

    // Processar apenas eventos de item atualizado
    if (type === 'ITEM_UPDATED' && itemId) {
      // Buscar contas do item
      const accounts = await client.fetchAccounts(itemId);
      const transactions = [];

      for (const account of accounts.results) {
        try {
          const accountTransactions = await client.fetchAllTransactions(account.id);
          transactions.push(...accountTransactions);

          // Salvar/atualizar conta no Supabase
          await supabase
            .from('accounts')
            .upsert({ 
              id: account.id, 
              itemId: account.itemId 
            }, {
              onConflict: 'id'
            });

          // Salvar/atualizar transações no Supabase
          if (accountTransactions.length > 0) {
            await supabase.from('transactions').upsert(
              accountTransactions.map((tx) => ({
                id: tx.id,
                accountId: tx.accountId,
                amount: tx.amount,
                category: tx.category,
                date: tx.date,
              })),
              {
                onConflict: 'id'
              }
            );
          }
        } catch (err) {
          console.error(`Error processing account ${account.id}:`, err);
        }
      }

      console.log(`Webhook processed: ${accounts.results.length} accounts, ${transactions.length} transactions`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
