-- =====================================================
-- FIX: Corrigir RLS para permitir checkout sem autenticação
-- =====================================================

-- 1. CUSTOMERS TABLE
-- Remover policies restritivas e permitir operações anônimas
DROP POLICY IF EXISTS "Anyone can create customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view their own customer profile" ON public.customers;
DROP POLICY IF EXISTS "Users can update their own customer profile" ON public.customers;
DROP POLICY IF EXISTS "Company owners can view their customers" ON public.customers;

-- Permitir criação anônima de clientes (checkout sem login)
CREATE POLICY "Public insert customers"
ON public.customers FOR INSERT
WITH CHECK (true);

-- Permitir leitura pelo próprio user_id (quando logado) ou por donos de empresa via orders
CREATE POLICY "Users can view own customer profile"
ON public.customers FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Company owners can view customers from orders"
ON public.customers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN companies c ON c.id = o.company_id
    WHERE o.customer_id = customers.id AND c.owner_id = auth.uid()
  )
);

-- Atualização pelo próprio user
CREATE POLICY "Users can update own customer"
ON public.customers FOR UPDATE
USING (user_id = auth.uid());

-- 2. CUSTOMER_ADDRESSES TABLE
-- Limpar policies conflitantes
DROP POLICY IF EXISTS "Customers can view their addresses by customer_id" ON public.customer_addresses;
DROP POLICY IF EXISTS "Anyone can create addresses with user_id or session_id" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users can create their own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Order addresses are viewable by company owners" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Customers can view their own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Company owners can view order addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Authenticated users can create addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON public.customer_addresses;

-- Permitir inserção anônima (checkout sem login) com session_id OU customer_id
CREATE POLICY "Public insert addresses"
ON public.customer_addresses FOR INSERT
WITH CHECK (
  -- Usuário autenticado pode criar para si
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Anônimo pode criar com session_id
  (auth.uid() IS NULL AND session_id IS NOT NULL AND user_id IS NULL)
  OR
  -- Anônimo pode criar vinculado a customer_id
  (auth.uid() IS NULL AND customer_id IS NOT NULL)
);

-- Leitura: próprio user_id
CREATE POLICY "Users view own addresses"
ON public.customer_addresses FOR SELECT
USING (user_id = auth.uid());

-- Leitura: donos de empresa veem endereços de pedidos
CREATE POLICY "Owners view order addresses"
ON public.customer_addresses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN companies c ON c.id = o.company_id
    WHERE o.delivery_address_id = customer_addresses.id
    AND c.owner_id = auth.uid()
  )
);

-- Atualização: somente dono do endereço
CREATE POLICY "Users update own addresses"
ON public.customer_addresses FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Deleção: somente dono
CREATE POLICY "Users delete own addresses"
ON public.customer_addresses FOR DELETE
USING (user_id = auth.uid());

-- 3. ORDERS TABLE - já permite INSERT anônimo, verificar
-- A policy "Anyone can create orders" já existe e permite WITH CHECK (true)
-- Não precisa alterar

-- 4. ORDER_ITEMS TABLE - já permite INSERT anônimo
-- A policy "Anyone can create order items" já existe
-- Não precisa alterar

-- 5. COUPONS - já tem policy pública para leitura de cupons ativos
-- Não precisa alterar