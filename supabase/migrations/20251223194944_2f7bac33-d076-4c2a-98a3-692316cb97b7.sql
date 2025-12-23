-- Create customers table for public customers (not store owners/drivers)
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(email),
  UNIQUE(phone)
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policies for customers table
CREATE POLICY "Anyone can create customers" ON public.customers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own customer profile" ON public.customers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own customer profile" ON public.customers
  FOR UPDATE USING (user_id = auth.uid());

-- Company owners can view customers who ordered from them
CREATE POLICY "Company owners can view their customers" ON public.customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN companies c ON c.id = o.company_id
      WHERE o.customer_id = auth.uid() AND c.owner_id = auth.uid()
    )
  );

-- Add is_default to customer_addresses
ALTER TABLE public.customer_addresses 
  ADD COLUMN IF NOT EXISTS label text DEFAULT 'Casa';

-- Update customer_addresses policies to allow public creation with phone lookup
DROP POLICY IF EXISTS "Guest checkout can create addresses" ON public.customer_addresses;

CREATE POLICY "Anyone can create addresses with user_id or session_id" ON public.customer_addresses
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );

-- Users can view addresses linked to them
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.customer_addresses;
CREATE POLICY "Users can view their own addresses" ON public.customer_addresses
  FOR SELECT USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to link customer on login (similar to driver linking)
CREATE OR REPLACE FUNCTION public.link_customer_on_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update customer record with matching email or phone to link to this user
  UPDATE public.customers
  SET user_id = NEW.id,
      updated_at = now()
  WHERE (email = NEW.email OR phone = NEW.phone)
    AND user_id IS NULL;
  
  -- Also link addresses that were created with guest session
  -- This links addresses from previous guest orders if email matches
  UPDATE public.customer_addresses
  SET user_id = NEW.id
  WHERE user_id IS NULL 
    AND session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.delivery_address_id = customer_addresses.id 
      AND orders.customer_email = NEW.email
    );
  
  RETURN NEW;
END;
$$;

-- Create trigger for linking customers on login
DROP TRIGGER IF EXISTS on_auth_user_created_link_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_link_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_customer_on_login();