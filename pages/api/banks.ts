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
    // Primeiro, buscar itemIds únicos do Supabase
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('itemId')
      .order('itemId');

    if (error) {
      console.error('Error fetching accounts from Supabase:', error);
    }

    // Obter itemIds únicos do Supabase
    const uniqueItemIdsFromSupabase = [...new Set(accounts?.map(acc => acc.itemId) || [])];

    // Também buscar todos os items diretamente do Pluggy para garantir que não perdemos nenhum
    let allItems = [];
    try {
      const itemsResponse = await client.fetchItems();
      allItems = itemsResponse.results || [];
    } catch (err) {
      console.error('Error fetching items from Pluggy:', err);
    }

    // Combinar itemIds do Supabase e do Pluggy
    const allItemIds = [...new Set([
      ...uniqueItemIdsFromSupabase,
      ...allItems.map(item => item.id)
    ])];

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
            lastUpdatedAt: item.updatedAt,
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
