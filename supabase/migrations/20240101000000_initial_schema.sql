-- ============================================
-- SCHEMA COMPLETO PARA PLUGGY MY EXPENSES
-- ============================================
-- Migration: Initial schema creation
-- ============================================

-- ============================================
-- TABELA: accounts
-- ============================================
-- Usando aspas para preservar camelCase (PostgreSQL converte para lowercase sem aspas)
CREATE TABLE IF NOT EXISTS public.accounts (
  id TEXT PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================
-- TABELA: transactions
-- ============================================
-- Usando aspas para preservar camelCase
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  category TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Adicionar foreign key separadamente (evita duplicatas)
DO $$
BEGIN
  -- Remover foreign keys existentes primeiro
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS fk_transactions_account;
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS fk_account;
  
  -- Criar apenas uma foreign key
  ALTER TABLE public.transactions
    ADD CONSTRAINT fk_transactions_account 
    FOREIGN KEY ("accountId") 
    REFERENCES public.accounts(id) 
    ON DELETE CASCADE
    ON UPDATE CASCADE;
END $$;

-- ============================================
-- ÍNDICES para Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accounts_itemId 
  ON public.accounts("itemId");

CREATE INDEX IF NOT EXISTS idx_transactions_accountId 
  ON public.transactions("accountId");

CREATE INDEX IF NOT EXISTS idx_transactions_date 
  ON public.transactions(date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_category 
  ON public.transactions(category) 
  WHERE category IS NOT NULL;

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Allow all operations on accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow all operations on transactions" ON public.transactions;

-- Políticas que permitem todas as operações (para service role)
-- IMPORTANTE: Isso permite acesso total. Ajuste conforme necessário para produção.
CREATE POLICY "Allow all operations on accounts" 
  ON public.accounts
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all operations on transactions" 
  ON public.transactions
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- ============================================
-- Função para atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_accounts_updated_at ON public.accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
