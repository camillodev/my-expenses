import type { NextApiRequest, NextApiResponse } from 'next';
import { PluggyClient } from 'pluggy-sdk';
import { createSupabaseClient, getSupabaseErrorResponse } from '../../lib/supabase';

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID || '';
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // #region agent log
  fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'items.ts:9',message:'Handler entry',data:{method:req.method,hasBody:!!req.body},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validar itemId
  const { itemId } = req.body;
  // #region agent log
  fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'items.ts:20',message:'ItemId validation',data:{itemId,itemIdType:typeof itemId,isValid:!!itemId&&typeof itemId==='string'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
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

  // #region agent log
  fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'items.ts:45',message:'Before fetchAccounts',data:{itemId,hasSupabaseClient:!!supabase},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  try {
    const accounts = await client.fetchAccounts(itemId);
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'items.ts:48',message:'After fetchAccounts',data:{accountsCount:accounts?.results?.length||0,firstAccountId:accounts?.results?.[0]?.id,firstAccountItemId:accounts?.results?.[0]?.itemId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const transactions = [];
    const errors: string[] = [];
    let accountsSaved = 0;
    let transactionsSaved = 0;
    
    for (const account of accounts.results) {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'items.ts:54',message:'Processing account',data:{accountId:account.id,accountItemId:account.itemId,hasId:!!account.id,hasItemId:!!account.itemId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        const accountTransactions = await client.fetchAllTransactions(account.id);
        transactions.push(...accountTransactions);

        // Salvar/atualizar conta no Supabase
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'items.ts:60',message:'Before account upsert',data:{accountId:account.id,itemId:account.itemId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const { error: accountError, data: accountData } = await supabase
          .from('accounts')
          .upsert({ 
            id: account.id, 
            itemId: account.itemId 
          }, {
            onConflict: 'id'
          })
          .select();

        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'items.ts:72',message:'After account upsert',data:{accountId:account.id,hasError:!!accountError,errorMessage:accountError?.message,errorCode:accountError?.code,dataLength:accountData?.length||0,dataIsNull:accountData===null,dataIsEmpty:Array.isArray(accountData)&&accountData.length===0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D'})}).catch(()=>{});
        // #endregion

        if (accountError) {
          const errorMsg = `Erro ao salvar conta ${account.id}: ${accountError.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        } else {
          // Se não houver erro, consideramos sucesso
          accountsSaved++;
          // #region agent log
          fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'items.ts:77',message:'Account saved successfully',data:{accountId:account.id,accountsSaved},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        }

        // Salvar/atualizar transações no Supabase
        if (accountTransactions.length > 0) {
          // #region agent log
          fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'items.ts:82',message:'Before transactions upsert',data:{accountId:account.id,transactionsCount:accountTransactions.length,firstTxId:accountTransactions[0]?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
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

          // #region agent log
          fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'items.ts:100',message:'After transactions upsert',data:{accountId:account.id,hasError:!!txError,errorMessage:txError?.message,errorCode:txError?.code,dataLength:txData?.length||0,dataIsNull:txData===null,dataIsEmpty:Array.isArray(txData)&&txData.length===0,expectedCount:accountTransactions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D'})}).catch(()=>{});
          // #endregion

          if (txError) {
            const errorMsg = `Erro ao salvar transações da conta ${account.id}: ${txError.message}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          } else {
            // Se não houver erro, consideramos sucesso
            transactionsSaved += accountTransactions.length;
            // #region agent log
            fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'items.ts:107',message:'Transactions saved successfully',data:{accountId:account.id,transactionsSaved},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
          }
        }
      } catch (err: any) {
        const errorMsg = `Erro ao processar conta ${account.id}: ${err.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'items.ts:114',message:'Final check before response',data:{accountsSaved,accountsTotal:accounts.results.length,transactionsSaved,transactionsTotal:transactions.length,errorsCount:errors.length,willFail:accountsSaved===0&&accounts.results.length>0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Se todas as contas falharam, retornar erro
    if (accountsSaved === 0 && accounts.results.length > 0) {
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'items.ts:118',message:'Returning error response',data:{error:'Falha ao salvar todas as contas',errors:errors},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return res.status(500).json({ 
        error: 'Falha ao salvar todas as contas',
        details: errors.join('; '),
        accountsProcessed: 0,
        transactionsProcessed: 0
      });
    }

    // Retornar sucesso mesmo com alguns erros (pelo menos alguns dados foram salvos)
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'items.ts:127',message:'Returning success response',data:{success:true,accountsSaved,transactionsSaved},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
