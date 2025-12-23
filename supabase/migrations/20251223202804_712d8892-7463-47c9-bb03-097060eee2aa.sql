-- Allow anonymous read of customers table for login lookup
CREATE POLICY "Anyone can lookup customers by email or phone"
ON public.customers
FOR SELECT
USING (true);

-- Allow anyone to read customer_addresses that are linked to orders
CREATE POLICY "Anyone can view addresses used in orders"
ON public.customer_addresses
FOR SELECT
USING (true);