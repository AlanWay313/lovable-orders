-- Drop overly permissive policies on customers table
DROP POLICY IF EXISTS "Anyone can lookup customers by email or phone" ON public.customers;

-- Drop overly permissive policies on customer_addresses table
DROP POLICY IF EXISTS "Anyone can view addresses used in orders" ON public.customer_addresses;
DROP POLICY IF EXISTS "Anyone can create customer addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Anyone can update customer addresses" ON public.customer_addresses;

-- Create proper RLS policy for customer_addresses - only allow viewing own addresses or by customer_id
CREATE POLICY "Customers can view their own addresses" 
ON public.customer_addresses 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);

-- Allow company owners to view addresses from their orders
CREATE POLICY "Company owners can view order addresses" 
ON public.customer_addresses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN companies c ON c.id = o.company_id
    WHERE o.delivery_address_id = customer_addresses.id
    AND c.owner_id = auth.uid()
  )
);

-- Allow creating addresses only for authenticated users or with valid session
CREATE POLICY "Authenticated users can create addresses" 
ON public.customer_addresses 
FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (session_id IS NOT NULL AND user_id IS NULL)
);

-- Allow updating only own addresses
CREATE POLICY "Users can update own addresses" 
ON public.customer_addresses 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());