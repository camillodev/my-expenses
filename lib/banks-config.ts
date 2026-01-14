/**
 * Configuração unificada de bancos alvo
 * Usado para mapear bancos entre diferentes fontes de dados
 */

export interface TargetBank {
  name: string;
  searchTerms: string[]; // Termos para buscar no nome do connector (lowercase)
  connectorNames: string[]; // Possíveis nomes exatos do connector no Pluggy
}

/**
 * Lista de bancos alvo com configuração de matching
 * Unificado para uso em index.tsx e connectors.ts
 */
export const TARGET_BANKS: TargetBank[] = [
  {
    name: 'Nubank',
    searchTerms: ['nubank', 'nu', 'nu bank'],
    connectorNames: ['Nubank', 'Nu Bank', 'Nu', 'Nubank S.A.'],
  },
  {
    name: 'Bradesco',
    searchTerms: ['bradesco'],
    connectorNames: ['Bradesco', 'Banco Bradesco S.A.', 'Bradesco S.A.'],
  },
  {
    name: 'XP',
    searchTerms: ['xp', 'xp investimentos', 'xp inc'],
    connectorNames: ['XP Investimentos', 'XP Inc', 'XP', 'XP Investimentos CCTVM S.A.'],
  },
  {
    name: 'BTG',
    searchTerms: ['btg', 'btg banking', 'btg pactual', 'btg investimentos'],
    connectorNames: ['BTG Pactual', 'BTG Banking', 'BTG Investimentos', 'BTG', 'Banco BTG Pactual S.A.'],
  },
];

/**
 * Encontra um banco alvo pelo nome
 */
export function findTargetBank(bankName: string): TargetBank | undefined {
  return TARGET_BANKS.find(tb => tb.name === bankName);
}

/**
 * Verifica se um nome de connector corresponde a um banco alvo
 */
export function matchesTargetBank(connectorName: string, targetBank: TargetBank): boolean {
  const connectorNameLower = connectorName.toLowerCase();
  
  // Verificar se corresponde a algum connectorName exato
  const exactMatch = targetBank.connectorNames.some(cn => 
    cn.toLowerCase() === connectorNameLower
  );
  if (exactMatch) return true;

  // Verificar se corresponde a algum searchTerm
  return targetBank.searchTerms.some(term => 
    connectorNameLower.includes(term.toLowerCase()) ||
    term.toLowerCase().includes(connectorNameLower)
  );
}

/**
 * Encontra o banco alvo que corresponde a um nome de connector
 */
export function findTargetBankByConnectorName(connectorName: string): TargetBank | undefined {
  return TARGET_BANKS.find(tb => matchesTargetBank(connectorName, tb));
}
