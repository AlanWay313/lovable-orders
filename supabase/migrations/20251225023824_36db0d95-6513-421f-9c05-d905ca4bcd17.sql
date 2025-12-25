-- Tabela para rastrear ofertas de pedidos a múltiplos entregadores
CREATE TABLE public.order_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.delivery_drivers(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, expired, cancelled
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  UNIQUE(order_id, driver_id)
);

-- Enable RLS
ALTER TABLE public.order_offers ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own offers
CREATE POLICY "Drivers can view their own offers"
ON public.order_offers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_drivers
    WHERE delivery_drivers.id = order_offers.driver_id
    AND delivery_drivers.user_id = auth.uid()
  )
);

-- Drivers can update their own offers (accept/decline)
CREATE POLICY "Drivers can update their own offers"
ON public.order_offers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_drivers
    WHERE delivery_drivers.id = order_offers.driver_id
    AND delivery_drivers.user_id = auth.uid()
  )
);

-- Company owners can view offers for their orders
CREATE POLICY "Company owners can view their order offers"
ON public.order_offers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = order_offers.company_id
    AND companies.owner_id = auth.uid()
  )
);

-- Company owners can manage offers for their orders
CREATE POLICY "Company owners can manage their order offers"
ON public.order_offers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = order_offers.company_id
    AND companies.owner_id = auth.uid()
  )
);

-- Enable realtime for offers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_offers;

-- Index for fast lookup
CREATE INDEX idx_order_offers_driver_status ON public.order_offers(driver_id, status);
CREATE INDEX idx_order_offers_order_status ON public.order_offers(order_id, status);