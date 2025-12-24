-- Allow drivers to update their own record (for location updates)
CREATE POLICY "Drivers can update their own record"
ON public.delivery_drivers
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());