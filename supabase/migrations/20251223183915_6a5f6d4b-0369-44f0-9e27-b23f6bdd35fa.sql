-- Drop existing restrictive policies for guest checkout
DROP POLICY IF EXISTS "Guest addresses can be created" ON public.customer_addresses;

-- Create permissive policy for anyone to create addresses (for guest checkout)
CREATE POLICY "Anyone can create addresses for checkout"
ON public.customer_addresses
FOR INSERT
WITH CHECK (true);

-- Also add policy for orders table to allow viewing addresses
CREATE POLICY "Order addresses are viewable by company owners"
ON public.customer_addresses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.companies c ON c.id = o.company_id
    WHERE o.delivery_address_id = customer_addresses.id
    AND c.owner_id = auth.uid()
  )
);