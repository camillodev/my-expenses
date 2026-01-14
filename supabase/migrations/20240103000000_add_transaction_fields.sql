-- ============================================
-- Migration: Add transaction fields
-- ============================================
-- Update transactions table to store full transaction details from Pluggy
-- This script adds columns for description, currencyCode, balance, status, type, providerCode, paymentData, and merchant (with CNPJ)

-- Add new columns to transactions table
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "currencyCode" TEXT,
  ADD COLUMN IF NOT EXISTS "balance" NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS "status" TEXT,
  ADD COLUMN IF NOT EXISTS "type" TEXT,
  ADD COLUMN IF NOT EXISTS "providerCode" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentData" JSONB,
  ADD COLUMN IF NOT EXISTS "merchant" JSONB;

-- Add comments for documentation
COMMENT ON COLUMN public.transactions."description" IS 'Transaction original description from Pluggy';
COMMENT ON COLUMN public.transactions."currencyCode" IS 'ISO Currency code of the Transaction (e.g., BRL, USD)';
COMMENT ON COLUMN public.transactions."balance" IS 'Current balance of the transaction, after transaction was made';
COMMENT ON COLUMN public.transactions."status" IS 'Status of the transaction (PENDING or POSTED)';
COMMENT ON COLUMN public.transactions."type" IS 'Transaction type of movement (DEBIT or CREDIT)';
COMMENT ON COLUMN public.transactions."providerCode" IS 'Code provided by the financial institution for the transaction type';
COMMENT ON COLUMN public.transactions."paymentData" IS 'Additional data related to payment or transfers (PIX, TED, DOC, participants, etc.)';
COMMENT ON COLUMN public.transactions."merchant" IS 'Additional data related to the merchant associated to the transaction (includes CNPJ, name, businessName, etc.)';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions("status");
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions("type");
CREATE INDEX IF NOT EXISTS idx_transactions_currencyCode ON public.transactions("currencyCode");
CREATE INDEX IF NOT EXISTS idx_transactions_date_status ON public.transactions("date", "status");

-- Create GIN index for JSONB columns to enable efficient queries on paymentData and merchant
CREATE INDEX IF NOT EXISTS idx_transactions_paymentData ON public.transactions USING GIN("paymentData");
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON public.transactions USING GIN("merchant");

-- Create index on merchant CNPJ for quick lookups (using JSONB path)
-- This allows queries like: SELECT * FROM transactions WHERE merchant->>'cnpj' = '12345678000190'
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_cnpj ON public.transactions((merchant->>'cnpj')) WHERE merchant IS NOT NULL;
