-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create a PERMISSIVE policy that allows anyone to insert orders
-- This is safe because:
-- 1. Orders are tied to a company_id (validated by FK)
-- 2. customer_id can be NULL for guest checkout
-- 3. All other sensitive operations (UPDATE, DELETE) are properly protected
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO public
WITH CHECK (true);

-- Also ensure order_items can be created by anyone
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

CREATE POLICY "Anyone can create order items"
ON public.order_items
FOR INSERT
TO public
WITH CHECK (true);