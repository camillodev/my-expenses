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

  const { itemId } = req.body;

  try {
    const accounts = await client.fetchAccounts(itemId);
    const transactions = [];
    
    for (const account of accounts.results) {
      try {
        const accountTransactions = await client.fetchAllTransactions(account.id);
        transactions.push(...accountTransactions);

        // Salvar/atualizar conta no Supabase
        const { error: accountError } = await supabase
          .from('accounts')
          .upsert({ 
            id: account.id, 
            itemId: account.itemId 
          }, {
            onConflict: 'id'
          });

        if (accountError) {
          console.error(`Error upserting account ${account.id}:`, accountError);
        }

        // Salvar/atualizar transações no Supabase
        if (accountTransactions.length > 0) {
          const { error: txError } = await supabase.from('transactions').upsert(
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

          if (txError) {
            console.error(`Error upserting transactions for account ${account.id}:`, txError);
          }
        }
      } catch (err) {
        console.error(`Error processing account ${account.id}:`, err);
      }
    }

    res.status(200).json({ 
      success: true, 
      accountsProcessed: accounts.results.length,
      transactionsProcessed: transactions.length 
    });
  } catch (error: any) {
    console.error('Error syncing item:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
