-- Allow users to insert their own store_owner role during signup
CREATE POLICY "Users can add store_owner role to themselves"
ON public.user_roles
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'store_owner'
);