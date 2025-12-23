-- Add PIX configuration and subscription fields to companies
ALTER TABLE public.companies
ADD COLUMN pix_key TEXT,
ADD COLUMN pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'cancelled', 'past_due')),
ADD COLUMN subscription_plan TEXT,
ADD COLUMN subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN monthly_order_count INTEGER DEFAULT 0,
ADD COLUMN order_count_reset_date TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update orders table to support cash payment details
ALTER TABLE public.orders
ADD COLUMN needs_change BOOLEAN DEFAULT false,
ADD COLUMN change_for NUMERIC;