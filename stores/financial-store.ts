/**
 * Store Zustand para gerenciar estado financeiro global
 * Centraliza toda a lógica de dados financeiros com debug logging
 */

import { create } from 'zustand';
import { generateRequestId, logApiRequest, logApiResponse, logDataProcessing, logError } from '@/lib/debug-logger';
import { PluggyService, type Investment } from '@/services/pluggy-service';
import { isCreditCardSubtype } from '@/lib/pluggy-utils';
import type { Account, Transaction } from '@/hooks/useFinancialData';

interface FinancialState {
  // Estado
  accounts: Account[];
  transactions: Transaction[];
  investments: Investment[];
  loading: boolean;
  error: string | null;

  // Computed (derivado de accounts)
  creditCards: Account[];

  // Actions
  fetchFinancialData: (itemId?: string) => Promise<void>;
  syncItem: (itemId: string) => Promise<boolean>;
  refreshData: (itemId?: string) => Promise<void>;
  setAccounts: (accounts: Account[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setInvestments: (investments: Investment[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useFinancialStore = create<FinancialState>((set, get) => {
  // Função helper para atualizar creditCards computed
  const updateCreditCards = (accounts: Account[]) => {
    const creditCards = accounts.filter(acc => isCreditCardSubtype(acc.subtype));
    return creditCards;
  };

  return {
    // Estado inicial
    accounts: [],
    transactions: [],
    investments: [],
    loading: false,
    error: null,
    creditCards: [],

    // Actions
    setAccounts: (accounts: Account[]) => {
      const creditCards = updateCreditCards(accounts);
      set({ accounts, creditCards });
    },

    setTransactions: (transactions: Transaction[]) => {
      set({ transactions });
    },

    setInvestments: (investments: Investment[]) => {
      set({ investments });
    },

    setLoading: (loading: boolean) => {
      set({ loading });
    },

    setError: (error: string | null) => {
      set({ error });
    },

    fetchFinancialData: async (itemId?: string) => {
      const requestId = generateRequestId();
      const startTime = Date.now();

      try {
        logApiRequest('fetchFinancialData', { itemId }, requestId);
        set({ loading: true, error: null });

        const pluggyService = new PluggyService();

        // Buscar contas
        logDataProcessing('fetchAccounts', { itemId }, null, requestId);
        const accounts = await pluggyService.fetchAccounts(itemId);
        logDataProcessing('fetchAccounts', { itemId }, { count: accounts.length }, requestId);
        
        const creditCards = updateCreditCards(accounts);
        set({ accounts, creditCards });

        // Buscar transações
        logDataProcessing('fetchTransactions', { itemId }, null, requestId);
        const transactions = await pluggyService.fetchTransactions(undefined, 100);
        logDataProcessing('fetchTransactions', { itemId }, { count: transactions.length }, requestId);
        set({ transactions });

        // Buscar investimentos se itemId fornecido
        if (itemId) {
          try {
            logDataProcessing('fetchInvestments', { itemId }, null, requestId);
            const investments = await pluggyService.fetchInvestments(itemId);
            logDataProcessing('fetchInvestments', { itemId }, { count: investments.length }, requestId);
            set({ investments });
          } catch (err: any) {
            // Investimentos podem não estar disponíveis, não é erro crítico
            logError('fetchInvestments', err, { itemId }, requestId);
            set({ investments: [] });
          }
        }

        const duration = Date.now() - startTime;
        logApiResponse('fetchFinancialData', { 
          success: true, 
          accountsCount: accounts.length,
          transactionsCount: transactions.length,
          investmentsCount: get().investments.length
        }, requestId, duration);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        logError('fetchFinancialData', error, { itemId }, requestId);
        set({ error: error.message || 'Erro ao carregar dados financeiros', loading: false });
      } finally {
        set({ loading: false });
      }
    },

    syncItem: async (itemId: string): Promise<boolean> => {
      const requestId = generateRequestId();
      const startTime = Date.now();

      try {
        logApiRequest('syncItem', { itemId }, requestId);
        set({ loading: true, error: null });

        const pluggyService = new PluggyService();
        const result = await pluggyService.syncItem(itemId);

        logDataProcessing('syncItem', { itemId }, result, requestId);

        // Aguardar um pouco para garantir que os dados foram salvos
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Buscar os novos dados
        await get().fetchFinancialData(itemId);

        const duration = Date.now() - startTime;
        logApiResponse('syncItem', { success: true, ...result }, requestId, duration);

        return true;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        logError('syncItem', error, { itemId }, requestId);
        set({ error: error.message || 'Erro ao sincronizar dados', loading: false });
        return false;
      } finally {
        set({ loading: false });
      }
    },

    refreshData: async (itemId?: string) => {
      await get().fetchFinancialData(itemId);
    },
  };
});
