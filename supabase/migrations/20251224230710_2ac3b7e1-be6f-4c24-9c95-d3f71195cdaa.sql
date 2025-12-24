-- Drop the existing insert policy
DROP POLICY IF EXISTS "Public insert addresses" ON public.customer_addresses;

-- Create a more permissive insert policy that handles all valid cases
CREATE POLICY "Public insert addresses" 
ON public.customer_addresses 
FOR INSERT 
WITH CHECK (
  -- Case 1: Authenticated user inserting their own address
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Case 2: Guest with session_id (no user_id)
  (user_id IS NULL AND session_id IS NOT NULL)
  OR
  -- Case 3: Customer-linked address (customer checkout without auth)
  (user_id IS NULL AND customer_id IS NOT NULL)
);