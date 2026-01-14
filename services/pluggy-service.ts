/**
 * Serviço centralizado para chamadas à API do Pluggy
 * Todas as operações são rastreadas com debug logging
 */

import { generateRequestId, logApiRequest, logApiResponse, logDataProcessing, logError } from '@/lib/debug-logger';
import type { Account, Transaction } from '@/hooks/useFinancialData';

export interface Investment {
  id: string;
  itemId: string;
  name?: string;
  type?: string;
  balance?: number;
  currencyCode?: string;
  institution?: string;
}

export class PluggyService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
  }

  /**
   * Buscar contas
   */
  async fetchAccounts(itemId?: string): Promise<Account[]> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      logApiRequest('/api/accounts', { itemId }, requestId);

      const url = itemId 
        ? `${this.baseUrl}/api/accounts?itemId=${itemId}`
        : `${this.baseUrl}/api/accounts`;
      
      const response = await fetch(url);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        logError('/api/accounts', new Error(errorData.error || 'Failed to fetch accounts'), { itemId, status: response.status }, requestId);
        throw new Error(errorData.error || 'Erro ao buscar contas');
      }

      const data = await response.json();
      logApiResponse('/api/accounts', { accountsCount: data.accounts?.length || 0 }, requestId, duration);

      return data.accounts || [];
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logError('/api/accounts', error, { itemId }, requestId);
      throw error;
    }
  }

  /**
   * Buscar detalhes de uma conta específica
   */
  async fetchAccountDetails(accountId: string): Promise<Account> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      logApiRequest('/api/accounts/:id', { accountId }, requestId);

      const response = await fetch(`${this.baseUrl}/api/accounts?accountId=${accountId}`);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        logError('/api/accounts/:id', new Error(errorData.error || 'Failed to fetch account'), { accountId, status: response.status }, requestId);
        throw new Error(errorData.error || 'Erro ao buscar conta');
      }

      const data = await response.json();
      logApiResponse('/api/accounts/:id', { account: data.account }, requestId, duration);

      return data.account;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logError('/api/accounts/:id', error, { accountId }, requestId);
      throw error;
    }
  }

  /**
   * Buscar transações
   */
  async fetchTransactions(accountId?: string, limit: number = 100): Promise<Transaction[]> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      logApiRequest('/api/transactions', { accountId, limit }, requestId);

      let url = `${this.baseUrl}/api/transactions?limit=${limit}`;
      if (accountId) {
        url += `&accountId=${accountId}`;
      }

      const response = await fetch(url);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        logError('/api/transactions', new Error(errorData.error || 'Failed to fetch transactions'), { accountId, limit, status: response.status }, requestId);
        throw new Error(errorData.error || 'Erro ao buscar transações');
      }

      const data = await response.json();
      logApiResponse('/api/transactions', { transactionsCount: data.transactions?.length || 0 }, requestId, duration);

      return data.transactions || [];
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logError('/api/transactions', error, { accountId, limit }, requestId);
      throw error;
    }
  }

  /**
   * Buscar investimentos
   */
  async fetchInvestments(itemId: string): Promise<Investment[]> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      logApiRequest('/api/investments', { itemId }, requestId);

      const response = await fetch(`${this.baseUrl}/api/investments?itemId=${itemId}`);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        logError('/api/investments', new Error(errorData.error || 'Failed to fetch investments'), { itemId, status: response.status }, requestId);
        throw new Error(errorData.error || 'Erro ao buscar investimentos');
      }

      const data = await response.json();
      logApiResponse('/api/investments', { investmentsCount: data.investments?.length || 0 }, requestId, duration);

      return data.investments || [];
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logError('/api/investments', error, { itemId }, requestId);
      throw error;
    }
  }

  /**
   * Sincronizar item completo
   */
  async syncItem(itemId: string): Promise<{ accounts: number; transactions: number; investments: number }> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      logApiRequest('/api/items', { itemId }, requestId);
      logDataProcessing('syncItem', { itemId }, null, requestId);

      const response = await fetch(`${this.baseUrl}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        logError('/api/items', new Error(errorData.error || 'Failed to sync item'), { itemId, status: response.status }, requestId);
        throw new Error(errorData.error || 'Erro ao sincronizar item');
      }

      const data = await response.json();
      logDataProcessing('syncItem', { itemId }, data, requestId);
      logApiResponse('/api/items', data, requestId, duration);

      return {
        accounts: data.accountsSaved || 0,
        transactions: data.transactionsSaved || 0,
        investments: data.investmentsSaved || 0,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logError('/api/items', error, { itemId }, requestId);
      throw error;
    }
  }
}
