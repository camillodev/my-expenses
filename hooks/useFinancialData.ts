import { useEffect } from 'react';
import { useFinancialStore } from '@/stores/financial-store';

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

/**
 * Hook wrapper para compatibilidade com código existente
 * Agora usa o store Zustand internamente
 */
export function useFinancialData(initialLoad: boolean = true): UseFinancialDataReturn {
  const {
    accounts,
    transactions,
    creditCards,
    loading,
    error,
    fetchFinancialData,
    refreshData,
    syncItem,
  } = useFinancialStore();

  // Carregar dados iniciais se initialLoad for true
  useEffect(() => {
    if (initialLoad) {
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
