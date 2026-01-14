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

  // Validar itemId
  const { itemId } = req.body;
  if (!itemId || typeof itemId !== 'string') {
    return res.status(400).json({ 
      error: 'itemId é obrigatório',
      details: 'O itemId deve ser fornecido no body da requisição'
    });
  }

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
    const accounts = await client.fetchAccounts(itemId);
    const transactions = [];
    const errors: string[] = [];
    let accountsSaved = 0;
    let transactionsSaved = 0;
    
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
          });

        if (accountError) {
          const errorMsg = `Erro ao salvar conta ${account.id}: ${accountError.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        } else if (!accountData || accountData.length === 0) {
          const errorMsg = `Falha ao salvar conta ${account.id}: nenhum dado retornado`;
          console.error(errorMsg);
          errors.push(errorMsg);
        } else {
          accountsSaved++;
        }

        // Salvar/atualizar transações no Supabase
        if (accountTransactions.length > 0) {
          const { error: txError, data: txData } = await supabase.from('transactions').upsert(
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
            const errorMsg = `Erro ao salvar transações da conta ${account.id}: ${txError.message}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          } else if (!txData || txData.length === 0) {
            const errorMsg = `Falha ao salvar transações da conta ${account.id}: nenhum dado retornado`;
            console.error(errorMsg);
            errors.push(errorMsg);
          } else {
            transactionsSaved += accountTransactions.length;
          }
        }
      } catch (err: any) {
        const errorMsg = `Erro ao processar conta ${account.id}: ${err.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Se todas as contas falharam, retornar erro
    if (accountsSaved === 0 && accounts.results.length > 0) {
      return res.status(500).json({ 
        error: 'Falha ao salvar todas as contas',
        details: errors.join('; '),
        accountsProcessed: 0,
        transactionsProcessed: 0
      });
    }

    // Retornar sucesso mesmo com alguns erros (pelo menos alguns dados foram salvos)
    res.status(200).json({ 
      success: true, 
      accountsProcessed: accounts.results.length,
      accountsSaved,
      transactionsProcessed: transactions.length,
      transactionsSaved,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Error syncing item:', error);
    res.status(500).json({ 
      error: 'Erro ao sincronizar item',
      details: error.message || 'Internal server error' 
    });
  }
}
