-- Drop existing INSERT policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create a proper PERMISSIVE INSERT policy for orders
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
TO public
WITH CHECK (true);

-- Also ensure order_items can be inserted
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

CREATE POLICY "Anyone can create order items" 
ON public.order_items 
FOR INSERT 
TO public
WITH CHECK (true);