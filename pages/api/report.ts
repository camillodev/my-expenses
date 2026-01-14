import { groupBy, sumBy, sortBy } from 'lodash';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseClient, getSupabaseErrorResponse } from '../../lib/supabase';
import { Transaction } from 'pluggy-sdk';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
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

  try {
    const { itemId } = req.query;

    if (!itemId || typeof itemId !== 'string') {
      return res.status(400).json({ 
        error: 'itemId é obrigatório',
        details: 'O itemId deve ser fornecido como query parameter'
      });
    }

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, accounts!fk_transactions_account(*)')
      .eq('accounts.itemId', itemId);

    if (error) {
      // Se tabela não existe, retornar dados vazios
      if (error.code === 'PGRST205') {
        return res.status(200).json({
          categoryBalances: [],
          startDate: null,
        });
      }
      console.error('Error fetching transactions:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar transações',
        details: error.message 
      });
    }

    const transactionsPerCategory = groupBy(
      transactions || [],
      (transaction) => transaction.category ?? 'Other'
    );

    const categoryBalances: { category: string; balance: number }[] = [];

    for (const category in transactionsPerCategory) {
      const categoryTransactions = transactionsPerCategory[category];
      const balance = +sumBy(
        categoryTransactions,
        (transaction) => transaction.amount
      ).toFixed(2);
      categoryBalances.push({ category, balance });
    }

    const startDate = transactions && transactions.length > 0 
      ? sortBy(transactions, ['date'])[0].date 
      : null;

    res.status(200).json({
      categoryBalances: sortBy(categoryBalances, ['balance']),
      startDate,
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar relatório',
      details: error.message || 'Internal server error' 
    });
  }
}
