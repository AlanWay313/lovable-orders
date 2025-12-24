-- Allow anyone to view orders by email (for guest order tracking)
CREATE POLICY "Anyone can view orders by email"
ON public.orders
FOR SELECT
USING (true);