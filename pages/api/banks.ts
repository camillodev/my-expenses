import type { NextApiRequest, NextApiResponse } from 'next';
import { PluggyClient } from 'pluggy-sdk';
import { createClient } from '@supabase/supabase-js';

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID || '';
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const client = new PluggyClient({
    clientId: PLUGGY_CLIENT_ID,
    clientSecret: PLUGGY_CLIENT_SECRET,
  });
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Primeiro, buscar itemIds únicos do Supabase (se a tabela existir)
    let accounts: any[] = [];
    if (SUPABASE_URL && SUPABASE_KEY) {
      const { data, error } = await supabase
        .from('accounts')
        .select('itemId')
        .order('itemId');

      if (error) {
        // Tabela pode não existir ainda - isso é ok
        if (error.code !== 'PGRST205') {
          console.error('Error fetching accounts from Supabase:', error);
        }
      } else {
        accounts = data || [];
      }
    }

    // Obter itemIds únicos do Supabase
    const itemIdsArray = accounts?.map(acc => acc.itemId).filter(Boolean) || [];
    const uniqueItemIdsFromSupabase = Array.from(new Set(itemIdsArray));

    // Usar apenas itemIds do Supabase (fetchItems não existe no SDK)
    const allItemIds = uniqueItemIdsFromSupabase;

    // Buscar informações detalhadas dos items
    const banks = await Promise.all(
      allItemIds.map(async (itemId) => {
        try {
          const item = await client.fetchItem(itemId);
          const connector = await client.fetchConnector(item.connector.id);
          return {
            itemId: item.id,
            connectorId: item.connector.id,
            bankName: connector.name,
            status: item.status,
            createdAt: item.createdAt,
            lastUpdatedAt: (item as any).updatedAt || item.createdAt,
          };
        } catch (err) {
          console.error(`Error fetching item ${itemId}:`, err);
          return null;
        }
      })
    );

    // Filtrar nulls e ordenar por data de criação
    const validBanks = banks
      .filter(bank => bank !== null)
      .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());

    res.status(200).json({ banks: validBanks });
  } catch (error: any) {
    console.error('Error fetching banks:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
