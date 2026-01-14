import type { NextApiRequest, NextApiResponse } from 'next';
import { PluggyClient } from 'pluggy-sdk';
import { createSupabaseClient, getSupabaseErrorResponse } from '../../lib/supabase';

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID || '';
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validar Supabase
  const supabaseError = getSupabaseErrorResponse();
  if (supabaseError) {
    console.error('Supabase not configured for webhook');
    return res.status(500).json(supabaseError);
  }

  const supabaseResult = createSupabaseClient();
  if (!supabaseResult.isValid || !supabaseResult.client) {
    console.error('Failed to create Supabase client for webhook');
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
    const { itemId, type } = req.body;

    // Processar apenas eventos de item atualizado
    if (type === 'ITEM_UPDATED' && itemId) {
      // Buscar contas do item
      const accounts = await client.fetchAccounts(itemId);
      const transactions = [];
      const errors: string[] = [];

      for (const account of accounts.results) {
        try {
          const accountTransactions = await client.fetchAllTransactions(account.id);
          transactions.push(...accountTransactions);

          // Salvar/atualizar conta no Supabase
          const { error: accountError, data: accountData } = await supabase
            .from('accounts')
            .upsert({ 
              id: account.id, 
              itemId: account.itemId 
            }, {
              onConflict: 'id'
            })
            .select();

          if (accountError) {
            const errorMsg = `Erro ao salvar conta ${account.id}: ${accountError.message}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }

          // Salvar/atualizar transações no Supabase
          if (accountTransactions.length > 0) {
            const { error: txError, data: txData } = await supabase
              .from('transactions')
              .upsert(
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
              )
              .select();

            if (txError) {
              const errorMsg = `Erro ao salvar transações da conta ${account.id}: ${txError.message}`;
              console.error(errorMsg);
              errors.push(errorMsg);
            }
          }
        } catch (err: any) {
          const errorMsg = `Erro ao processar conta ${account.id}: ${err.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      if (errors.length > 0) {
        console.error(`Webhook processed with errors: ${accounts.results.length} accounts, ${transactions.length} transactions. Errors: ${errors.join('; ')}`);
      } else {
        console.log(`Webhook processed: ${accounts.results.length} accounts, ${transactions.length} transactions`);
      }
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ 
      error: 'Erro ao processar webhook',
      details: error.message || 'Internal server error' 
    });
  }
}
