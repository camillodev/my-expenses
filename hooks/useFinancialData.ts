import { useState, useEffect, useCallback } from 'react';

export interface Account {
  id: string;
  itemId: string;
  name?: string;
  type?: string;
  subtype?: string;
  balance?: number;
  currencyCode?: string;
  creditLimit?: number;      // For credit cards - total credit limit
  availableCredit?: number;   // For credit cards - available credit
  currentInvoice?: number;     // For credit cards - current invoice amount (if separate from balance)
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  category?: string;
  date: string;
  description?: string;
  currencyCode?: string;
  balance?: number;
  status?: string; // 'PENDING' | 'POSTED'
  type?: string; // 'DEBIT' | 'CREDIT'
  providerCode?: string;
  paymentData?: {
    payer?: {
      documentNumber?: { value?: string; type?: 'CPF' | 'CNPJ' };
      name?: string;
      accountNumber?: string;
      branchNumber?: string;
      routingNumber?: string;
    };
    receiver?: {
      documentNumber?: { value?: string; type?: 'CPF' | 'CNPJ' };
      name?: string;
      accountNumber?: string;
      branchNumber?: string;
      routingNumber?: string;
    };
    paymentMethod?: string;
    referenceNumber?: string;
    reason?: string;
  };
  merchant?: {
    name: string;
    businessName: string;
    cnpj: string;
    cnae?: string;
    category?: string;
  };
  accounts?: Account;
}

interface UseFinancialDataReturn {
  accounts: Account[];
  transactions: Transaction[];
  creditCards: Account[];
  loading: boolean;
  error: string | null;
  fetchFinancialData: (itemId?: string) => Promise<void>;
  refreshData: (itemId?: string) => Promise<void>;
  syncItem: (itemId: string) => Promise<boolean>;
}

export function useFinancialData(initialLoad: boolean = true): UseFinancialDataReturn {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(initialLoad);
  const [error, setError] = useState<string | null>(null);

  // Filtrar cartões de crédito das contas
  const creditCards = accounts.filter(acc => acc.subtype === 'credit_card');
  
  // Log creditCards calculation
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:41',message:'creditCards calculated',data:{accountsCount:accounts.length,creditCardsCount:creditCards.length,accountsWithSubtype:accounts.filter(a=>a.subtype).map(a=>({id:a.id,subtype:a.subtype}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
  }, [accounts.length, creditCards.length]);

  const fetchFinancialData = useCallback(async (itemId?: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:43',message:'fetchFinancialData called',data:{itemId:itemId||'undefined',initialLoad},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      setLoading(true);
      setError(null);

      // Buscar contas
      const accountsUrl = itemId 
        ? `/api/accounts?itemId=${itemId}` 
        : '/api/accounts';
      
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:52',message:'Fetching accounts',data:{accountsUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      const accountsResponse = await fetch(accountsUrl);
      if (!accountsResponse.ok) {
        const errorData = await accountsResponse.json();
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:56',message:'Accounts fetch failed',data:{status:accountsResponse.status,error:errorData.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        throw new Error(errorData.error || 'Erro ao carregar contas');
      }

      const accountsData = await accountsResponse.json();
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:60',message:'Accounts data received',data:{hasAccounts:!!accountsData.accounts,accountsCount:accountsData.accounts?.length||0,accountsDataKeys:Object.keys(accountsData)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      if (accountsData.error) {
        throw new Error(accountsData.error || 'Erro ao carregar contas');
      }

      setAccounts(accountsData.accounts || []);

      // Buscar transações
      const transactionsUrl = itemId
        ? `/api/transactions?itemId=${itemId}&limit=100`
        : '/api/transactions?limit=100';

      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:70',message:'Fetching transactions',data:{transactionsUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      const transactionsResponse = await fetch(transactionsUrl);
      if (!transactionsResponse.ok) {
        const errorData = await transactionsResponse.json();
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:75',message:'Transactions fetch failed',data:{status:transactionsResponse.status,error:errorData.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        throw new Error(errorData.error || 'Erro ao carregar transações');
      }

      const transactionsData = await transactionsResponse.json();
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:79',message:'Transactions data received',data:{hasTransactions:!!transactionsData.transactions,transactionsCount:transactionsData.transactions?.length||0,transactionsDataKeys:Object.keys(transactionsData)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      if (transactionsData.error) {
        throw new Error(transactionsData.error || 'Erro ao carregar transações');
      }

      setTransactions(transactionsData.transactions || []);
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:83',message:'fetchFinancialData success',data:{accountsSet:accountsData.accounts?.length||0,transactionsSet:transactionsData.transactions?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } catch (err: any) {
      console.error('Error fetching financial data:', err);
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:85',message:'fetchFinancialData error',data:{error:err.message,stack:err.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setError(err.message || 'Erro ao carregar dados financeiros');
      // Não limpar dados em caso de erro, apenas reportar
    } finally {
      setLoading(false);
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:89',message:'fetchFinancialData finished, loading set to false',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    }
  }, []);

  const refreshData = useCallback(async (itemId?: string) => {
    await fetchFinancialData(itemId);
  }, [fetchFinancialData]);

  const syncItem = useCallback(async (itemId: string): Promise<boolean> => {
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:96',message:'syncItem called',data:{itemId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      setLoading(true);
      setError(null);

      // Sincronizar dados do item
      const itemsResponse = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });

      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:106',message:'syncItem API response',data:{status:itemsResponse.status,ok:itemsResponse.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (!itemsResponse.ok) {
        const errorData = await itemsResponse.json();
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:110',message:'syncItem API error',data:{error:errorData.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        throw new Error(errorData.error || 'Erro ao sincronizar dados');
      }

      const itemsData = await itemsResponse.json();
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:116',message:'syncItem data received',data:{hasError:!!itemsData.error,accountsSaved:itemsData.accountsSaved,transactionsSaved:itemsData.transactionsSaved,errorsCount:itemsData.errors?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // Verificar se houve erros na sincronização
      if (itemsData.error) {
        throw new Error(itemsData.error || 'Erro ao salvar dados no banco de dados');
      }

      // Verificar se pelo menos alguns dados foram salvos
      if (itemsData.errors && itemsData.errors.length > 0) {
        const hasPartialSuccess = itemsData.accountsSaved > 0 || itemsData.transactionsSaved > 0;
        if (!hasPartialSuccess) {
          throw new Error('Falha ao salvar dados. Verifique a configuração do banco de dados.');
        }
        // Sucesso parcial - não lançar erro, mas o componente pode tratar
      }

      // Aguardar um pouco para garantir que os dados foram salvos
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Buscar os novos dados
      await fetchFinancialData(itemId);
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:133',message:'syncItem success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      return true;
    } catch (err: any) {
      console.error('Error syncing item:', err);
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:137',message:'syncItem error',data:{error:err.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setError(err.message || 'Erro ao sincronizar dados');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchFinancialData]);

  // Carregar dados iniciais se initialLoad for true
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:146',message:'useEffect initialLoad check',data:{initialLoad},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (initialLoad) {
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:148',message:'Calling fetchFinancialData from useEffect',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      fetchFinancialData();
    }
  }, [initialLoad, fetchFinancialData]);

  return {
    accounts,
    transactions,
    creditCards,
    loading,
    error,
    fetchFinancialData,
    refreshData,
    syncItem,
  };
}
