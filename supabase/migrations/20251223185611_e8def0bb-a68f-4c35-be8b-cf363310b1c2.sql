-- Fix customer_addresses RLS for guest checkout (secure + avoids conflicts)

-- Remove overly-permissive / conflicting policies
DROP POLICY IF EXISTS "Anyone can create addresses for checkout" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.customer_addresses;

-- Guest checkout: allow anonymous inserts only when not linking to a user
CREATE POLICY "Guest checkout can create addresses"
ON public.customer_addresses
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Authenticated users: can insert their own addresses
CREATE POLICY "Users can create their own addresses"
ON public.customer_addresses
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Authenticated users: can view/update/delete their own addresses
CREATE POLICY "Users can view their own addresses"
ON public.customer_addresses
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own addresses"
ON public.customer_addresses
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own addresses"
ON public.customer_addresses
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
