-- ============================================
-- Migration: Add account fields
-- ============================================
-- Update accounts table to store full account details from Pluggy
-- This script adds columns for account name, type, balance, currency, and credit card specific fields

-- Add new columns to accounts table
ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "type" TEXT,
  ADD COLUMN IF NOT EXISTS "subtype" TEXT,
  ADD COLUMN IF NOT EXISTS "balance" NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS "currencyCode" TEXT,
  ADD COLUMN IF NOT EXISTS "creditLimit" NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS "availableCredit" NUMERIC(15, 2);

-- Add comments for documentation
COMMENT ON COLUMN public.accounts."name" IS 'Account name from Pluggy';
COMMENT ON COLUMN public.accounts."type" IS 'Account type (e.g., bank, credit, investment)';
COMMENT ON COLUMN public.accounts."subtype" IS 'Account subtype (e.g., checking, savings, credit_card, brokerage)';
COMMENT ON COLUMN public.accounts."balance" IS 'Current account balance';
COMMENT ON COLUMN public.accounts."currencyCode" IS 'Currency code (e.g., BRL, USD)';
COMMENT ON COLUMN public.accounts."creditLimit" IS 'Credit limit for credit cards';
COMMENT ON COLUMN public.accounts."availableCredit" IS 'Available credit for credit cards';

-- Create index on type and subtype for faster filtering
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts("type");
CREATE INDEX IF NOT EXISTS idx_accounts_subtype ON public.accounts("subtype");
CREATE INDEX IF NOT EXISTS idx_accounts_itemid_type ON public.accounts("itemId", "type");
