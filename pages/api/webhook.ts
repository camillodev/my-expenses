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
          // Fetch full account details
          const accountDetails = await client.fetchAccount(account.id);
          const accountTransactions = await client.fetchAllTransactions(account.id);
          transactions.push(...accountTransactions);

          // Extract credit card specific fields
          const creditLimit = (accountDetails as any).creditLimit || 
                             (accountDetails as any).creditData?.limit || 
                             (accountDetails as any).limit || 
                             null;
          const availableCredit = (accountDetails as any).availableCredit || 
                                 (accountDetails as any).creditData?.availableCredit || 
                                 (accountDetails as any).available || 
                                 null;

          // Prepare account data for Supabase
          const accountDataToSave: any = {
            id: account.id,
            itemId: account.itemId,
            name: accountDetails.name || null,
            type: accountDetails.type || null,
            subtype: accountDetails.subtype || null,
            balance: accountDetails.balance !== undefined ? accountDetails.balance : null,
            currencyCode: accountDetails.currencyCode || null,
            creditLimit: creditLimit !== null && creditLimit !== undefined ? creditLimit : null,
            availableCredit: availableCredit !== null && availableCredit !== undefined ? availableCredit : null,
          };

          // Salvar/atualizar conta no Supabase com todos os campos
          const { error: accountError, data: accountData } = await supabase
            .from('accounts')
            .upsert(accountDataToSave, {
              onConflict: 'id'
            })
            .select();

          if (accountError) {
            const errorMsg = `Erro ao salvar conta ${account.id}: ${accountError.message}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }

          // Salvar/atualizar transações no Supabase com todos os campos disponíveis
          if (accountTransactions.length > 0) {
            const { error: txError, data: txData } = await supabase
              .from('transactions')
              .upsert(
                accountTransactions.map((tx) => ({
                  id: tx.id,
                  accountId: tx.accountId,
                  amount: tx.amount,
                  category: tx.category || null,
                  date: tx.date,
                  description: tx.description || null,
                  currencyCode: tx.currencyCode || null,
                  balance: tx.balance !== undefined ? tx.balance : null,
                  status: tx.status || null,
                  type: tx.type || null,
                  providerCode: tx.providerCode || null,
                  paymentData: tx.paymentData ? JSON.parse(JSON.stringify(tx.paymentData)) : null,
                  merchant: tx.merchant ? JSON.parse(JSON.stringify(tx.merchant)) : null,
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
