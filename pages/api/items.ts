import type { NextApiRequest, NextApiResponse } from 'next';
import { PluggyClient } from 'pluggy-sdk';
import { createSupabaseClient, getSupabaseErrorResponse } from '../../lib/supabase';
import { generateRequestId, logApiRequest, logApiResponse, logDataProcessing, logError } from '../../lib/debug-logger';
import { extractCreditData } from '../../lib/pluggy-utils';

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID || '';
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  if (req.method !== 'POST') {
    logError('/api/items', new Error('Method not allowed'), { method: req.method }, requestId);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validar itemId
  const { itemId } = req.body;
  if (!itemId || typeof itemId !== 'string') {
    logError('/api/items', new Error('itemId is required'), { body: req.body }, requestId);
    return res.status(400).json({ 
      error: 'itemId é obrigatório',
      details: 'O itemId deve ser fornecido no body da requisição'
    });
  }

  logApiRequest('/api/items', { itemId }, requestId);

  // Validar Supabase
  const supabaseError = getSupabaseErrorResponse();
  if (supabaseError) {
    logError('/api/items', new Error('Supabase configuration error'), supabaseError, requestId);
    return res.status(500).json(supabaseError);
  }

  const supabaseResult = createSupabaseClient();
  if (!supabaseResult.isValid || !supabaseResult.client) {
    logError('/api/items', new Error('Supabase client error'), supabaseResult.error, requestId);
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
    logDataProcessing('fetchAccounts', { itemId }, null, requestId);
    const accounts = await client.fetchAccounts(itemId);
    logDataProcessing('fetchAccounts', { itemId }, { accountsCount: accounts.results?.length || 0 }, requestId);

    const transactions = [];
    const errors: string[] = [];
    let accountsSaved = 0;
    let transactionsSaved = 0;
    let investmentsSaved = 0;
    
    // Debug: Log first account of each type to inspect structure
    const accountTypesSeen = new Set<string>();
    const debugAccounts: any[] = [];
    
    for (const account of accounts.results) {
      try {
        // Fetch full account details for debugging and saving
        const accountDetails = await client.fetchAccount(account.id);
        
        // Debug: Log first account of each type/subtype combination
        const typeKey = `${accountDetails.type || 'unknown'}_${accountDetails.subtype || 'unknown'}`;
        if (!accountTypesSeen.has(typeKey)) {
          accountTypesSeen.add(typeKey);
          console.log(`[DEBUG] First ${typeKey} account structure:`, JSON.stringify(accountDetails, null, 2));
          debugAccounts.push({
            type: accountDetails.type,
            subtype: accountDetails.subtype,
            fullAccount: accountDetails
          });
        }
        
        const accountTransactions = await client.fetchAllTransactions(account.id);
        transactions.push(...accountTransactions);

        // Extract credit card specific fields using utility function
        const creditData = extractCreditData(accountDetails);
        logDataProcessing('extractCreditData', { accountId: account.id, subtype: accountDetails.subtype }, creditData, requestId);

        // Prepare account data for Supabase
        const accountDataToSave: any = {
          id: account.id,
          itemId: account.itemId,
          name: accountDetails.name || null,
          type: accountDetails.type || null,
          subtype: accountDetails.subtype || null,
          balance: accountDetails.balance !== undefined ? accountDetails.balance : null,
          currencyCode: accountDetails.currencyCode || null,
          creditLimit: creditData.creditLimit ?? null,
          availableCredit: creditData.availableCredit ?? null,
          currentInvoice: creditData.currentInvoice ?? null,
        };

        // Salvar/atualizar conta no Supabase com todos os campos
        logDataProcessing('processAccount', { accountId: account.id }, accountDataToSave, requestId);
        const { error: accountError, data: accountData } = await supabase
          .from('accounts')
          .upsert(accountDataToSave, {
            onConflict: 'id'
          })
          .select();

        if (accountError) {
          const errorMsg = `Erro ao salvar conta ${account.id}: ${accountError.message}`;
          logError('/api/items', accountError, { accountId: account.id }, requestId);
          errors.push(errorMsg);
        } else {
          // Se não houver erro, consideramos sucesso
          accountsSaved++;
          logDataProcessing('processAccount', { accountId: account.id }, { saved: true }, requestId);
        }

        // Salvar/atualizar transações no Supabase com todos os campos disponíveis
        if (accountTransactions.length > 0) {
          logDataProcessing('processTransactions', { accountId: account.id, count: accountTransactions.length }, null, requestId);
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
            logError('/api/items', txError, { accountId: account.id, transactionsCount: accountTransactions.length }, requestId);
            errors.push(errorMsg);
          } else {
            // Se não houver erro, consideramos sucesso
            transactionsSaved += accountTransactions.length;
            logDataProcessing('processTransactions', { accountId: account.id }, { saved: accountTransactions.length }, requestId);
          }
        }
      } catch (err: any) {
        const errorMsg = `Erro ao processar conta ${account.id}: ${err.message}`;
        logError('/api/items', err, { accountId: account.id }, requestId);
        errors.push(errorMsg);
      }
    }

    // Buscar e salvar investimentos
    try {
      logDataProcessing('fetchInvestments', { itemId }, null, requestId);
      
      // Verificar se o método fetchInvestments existe no SDK
      // Se não existir, buscar contas e filtrar por type='investment'
      let investments: any[] = [];
      
      if (typeof (client as any).fetchInvestments === 'function') {
        const investmentsResponse = await (client as any).fetchInvestments(itemId);
        investments = investmentsResponse.results || [];
      } else {
        // Fallback: buscar contas e filtrar investimentos
        const accountsResponse = await client.fetchAccounts(itemId);
        investments = (accountsResponse.results || []).filter(
          (acc: any) => acc.type === 'investment' || acc.subtype === 'investment' || 
                       acc.subtype === 'brokerage' || acc.subtype === 'mutual_fund'
        );
      }
      
      logDataProcessing('fetchInvestments', { itemId }, { investmentsCount: investments.length }, requestId);

      // Salvar investimentos (usando a mesma tabela accounts com type='investment')
      if (investments && investments.length > 0) {
        for (const investment of investments) {
          try {
            const investmentData = {
              id: investment.id,
              itemId: investment.itemId || itemId,
              name: investment.name || null,
              type: 'investment',
              subtype: investment.type || investment.subtype || 'investment',
              balance: investment.balance !== undefined ? investment.balance : null,
              currencyCode: investment.currencyCode || null,
            };

            logDataProcessing('processInvestment', { investmentId: investment.id }, investmentData, requestId);
            const { error: invError } = await supabase
              .from('accounts')
              .upsert(investmentData, { onConflict: 'id' });

            if (invError) {
              logError('/api/items', invError, { investmentId: investment.id }, requestId);
              errors.push(`Erro ao salvar investimento ${investment.id}: ${invError.message}`);
            } else {
              investmentsSaved++;
              logDataProcessing('processInvestment', { investmentId: investment.id }, { saved: true }, requestId);
            }
          } catch (err: any) {
            logError('/api/items', err, { investmentId: investment.id }, requestId);
            errors.push(`Erro ao processar investimento ${investment.id}: ${err.message}`);
          }
        }
      }
    } catch (err: any) {
      // Investimentos podem não estar disponíveis, não é erro crítico
      logError('/api/items', err, { itemId, step: 'fetchInvestments' }, requestId);
    }

    // Se todas as contas falharam, retornar erro
    if (accountsSaved === 0 && accounts.results.length > 0) {
      const duration = Date.now() - startTime;
      logApiResponse('/api/items', { success: false, error: 'Falha ao salvar todas as contas' }, requestId, duration);
      return res.status(500).json({ 
        error: 'Falha ao salvar todas as contas',
        details: errors.join('; '),
        accountsProcessed: 0,
        transactionsProcessed: 0
      });
    }

    // Retornar sucesso mesmo com alguns erros (pelo menos alguns dados foram salvos)
    const duration = Date.now() - startTime;
    const response = {
      success: true, 
      accountsProcessed: accounts.results.length,
      accountsSaved,
      transactionsProcessed: transactions.length,
      transactionsSaved,
      investmentsSaved,
      errors: errors.length > 0 ? errors : undefined,
      debug: debugAccounts
    };
    logApiResponse('/api/items', response, requestId, duration);
    res.status(200).json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError('/api/items', error, { itemId: req.body.itemId }, requestId);
    res.status(500).json({ 
      error: 'Erro ao sincronizar item',
      details: error.message || 'Internal server error' 
    });
  }
}
