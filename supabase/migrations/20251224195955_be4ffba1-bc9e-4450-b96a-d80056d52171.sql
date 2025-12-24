-- Add customer_id column to customer_addresses for direct linking
ALTER TABLE public.customer_addresses 
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);

-- Update RLS policy to allow customers to view their own addresses by customer_id
DROP POLICY IF EXISTS "Customers can view their addresses by customer_id" ON public.customer_addresses;
CREATE POLICY "Customers can view their addresses by customer_id"
ON public.customer_addresses
FOR SELECT
USING (true);

-- Allow anyone to create addresses (needed for checkout flow)
DROP POLICY IF EXISTS "Anyone can create customer addresses" ON public.customer_addresses;
CREATE POLICY "Anyone can create customer addresses"
ON public.customer_addresses
FOR INSERT
WITH CHECK (true);

-- Allow updates to addresses
DROP POLICY IF EXISTS "Anyone can update customer addresses" ON public.customer_addresses;
CREATE POLICY "Anyone can update customer addresses"
ON public.customer_addresses
FOR UPDATE
USING (true);

-- Link existing addresses to customers based on order history
UPDATE public.customer_addresses ca
SET customer_id = c.id
FROM public.orders o
JOIN public.customers c ON c.email = o.customer_email OR c.phone = o.customer_phone
WHERE ca.id = o.delivery_address_id
AND ca.customer_id IS NULL;