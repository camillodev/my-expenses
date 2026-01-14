import type { NextApiRequest, NextApiResponse } from 'next'
import { PluggyClient } from 'pluggy-sdk'

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID || ''
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || ''

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ accessToken: string }>
) {
  try {
    const client = new PluggyClient({
      clientId: PLUGGY_CLIENT_ID,
      clientSecret: PLUGGY_CLIENT_SECRET,
    });

    // Sempre gerar token genérico (sem connectorId)
    // O usuário selecionará o banco no widget do Pluggy
    const connectToken = await client.createConnectToken();

    // O createConnectToken retorna um objeto com accessToken
    const accessToken = typeof connectToken === 'string' 
      ? connectToken 
      : connectToken?.accessToken || '';

    res.status(200).json({ accessToken });
  } catch (error: any) {
    console.error('Error creating connect token:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      accessToken: '' 
    });
  }
}
