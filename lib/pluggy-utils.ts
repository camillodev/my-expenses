/**
 * Utilitários para trabalhar com dados do Pluggy
 * Normalização de subtypes e extração de dados de crédito
 */

/**
 * Constante com todos os subtypes de conta do Pluggy
 * Baseado na documentação oficial
 */
export const PLUGGY_ACCOUNT_SUBTYPES = {
  // Credit Cards (variações possíveis)
  CREDIT_CARD: 'CREDIT_CARD',
  CREDIT_CARD_ACCOUNT: 'CREDIT_CARD_ACCOUNT',
  
  // Bank Accounts
  CHECKING_ACCOUNT: 'CHECKING_ACCOUNT',
  SAVINGS_ACCOUNT: 'SAVINGS_ACCOUNT',
  CHECKING: 'CHECKING',
  SAVINGS: 'SAVINGS',
  
  // Investment Accounts
  INVESTMENT: 'INVESTMENT',
  BROKERAGE: 'BROKERAGE',
  MUTUAL_FUND: 'MUTUAL_FUND',
  
  // Loan Accounts
  LOAN: 'LOAN',
  MORTGAGE: 'MORTGAGE',
  
  // Other
  PREPAID: 'PREPAID',
  OTHER: 'OTHER',
} as const;

/**
 * Array com todas as variações de cartão de crédito (uppercase e lowercase)
 * Usado para identificar contas de cartão de crédito independente do formato
 */
export const CREDIT_CARD_SUBTYPES = [
  PLUGGY_ACCOUNT_SUBTYPES.CREDIT_CARD,
  PLUGGY_ACCOUNT_SUBTYPES.CREDIT_CARD_ACCOUNT,
  // Lowercase variations (para compatibilidade)
  'credit_card',
  'credit_card_account',
];

/**
 * Normaliza subtype de conta para formato consistente (lowercase)
 * Mapeia variações conhecidas para valores normalizados
 */
export function normalizeAccountSubtype(subtype: string | null | undefined): string {
  if (!subtype) {
    return '';
  }

  const normalized = subtype.toLowerCase().trim();

  // Mapear variações de cartão de crédito
  if (normalized === 'credit_card' || normalized === 'credit_card_account') {
    return 'credit_card';
  }

  // Mapear variações de conta corrente
  if (normalized === 'checking' || normalized === 'checking_account') {
    return 'checking';
  }

  // Mapear variações de poupança
  if (normalized === 'savings' || normalized === 'savings_account') {
    return 'savings';
  }

  // Mapear variações de investimento
  if (normalized === 'investment' || normalized === 'brokerage' || normalized === 'mutual_fund') {
    return 'investment';
  }

  // Retornar lowercase para outros tipos
  return normalized;
}

/**
 * Verifica se um subtype é de cartão de crédito
 * Usa a constante CREDIT_CARD_SUBTYPES para comparação
 */
export function isCreditCardSubtype(subtype: string | null | undefined): boolean {
  if (!subtype) {
    return false;
  }

  const normalized = normalizeAccountSubtype(subtype);
  return normalized === 'credit_card';
}

/**
 * Extrai dados de crédito de uma conta do Pluggy
 * Suporta diferentes estruturas de dados retornadas pela API
 */
export function extractCreditData(account: any): {
  creditLimit: number | null;
  availableCredit: number | null;
  currentInvoice: number | null;
} {
  // Tentar extrair de creditData primeiro (estrutura preferida)
  const creditData = account.creditData || (account as any).credit_data;
  
  let creditLimit: number | null = null;
  let availableCredit: number | null = null;
  let currentInvoice: number | null = null;

  // Extrair creditLimit
  if (creditData?.totalCreditLimit !== undefined && creditData?.totalCreditLimit !== null) {
    creditLimit = creditData.totalCreditLimit;
  } else if (creditData?.limit !== undefined && creditData?.limit !== null) {
    creditLimit = creditData.limit;
  } else if (account.creditLimit !== undefined && account.creditLimit !== null) {
    creditLimit = account.creditLimit;
  } else if ((account as any).limit !== undefined && (account as any).limit !== null) {
    creditLimit = (account as any).limit;
  }

  // Extrair availableCredit
  if (creditData?.availableCreditLimit !== undefined && creditData?.availableCreditLimit !== null) {
    availableCredit = creditData.availableCreditLimit;
  } else if (creditData?.availableCredit !== undefined && creditData?.availableCredit !== null) {
    availableCredit = creditData.availableCredit;
  } else if (creditData?.available !== undefined && creditData?.available !== null) {
    availableCredit = creditData.available;
  } else if (account.availableCredit !== undefined && account.availableCredit !== null) {
    availableCredit = account.availableCredit;
  } else if ((account as any).available !== undefined && (account as any).available !== null) {
    availableCredit = (account as any).available;
  }

  // Extrair currentInvoice (fatura atual)
  // Para cartões de crédito, o balance geralmente é negativo (representa a fatura)
  if (creditData?.balance !== undefined && creditData?.balance !== null) {
    currentInvoice = Math.abs(creditData.balance);
  } else if (isCreditCardSubtype(account.subtype) && account.balance !== undefined && account.balance !== null) {
    // Se for cartão e balance for negativo, é a fatura
    currentInvoice = Math.abs(account.balance);
  }

  return {
    creditLimit,
    availableCredit,
    currentInvoice,
  };
}
