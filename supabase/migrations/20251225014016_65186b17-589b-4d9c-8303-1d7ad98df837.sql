-- Create subscription_plans table to store plan configurations
CREATE TABLE public.subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    price numeric NOT NULL DEFAULT 0,
    order_limit integer NOT NULL DEFAULT 1000,
    stripe_price_id text,
    stripe_product_id text,
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans (for public display)
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

-- Super admins can manage all plans
CREATE POLICY "Super admins can manage plans"
ON public.subscription_plans
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- Insert default plans
INSERT INTO public.subscription_plans (key, name, description, price, order_limit, stripe_price_id, stripe_product_id, features, sort_order) VALUES
('free', 'Gratuito', 'Ideal para começar', 0, 1000, NULL, NULL, '["Até 1.000 pedidos/mês", "Cardápio digital", "Gestão de pedidos", "Notificações em tempo real"]'::jsonb, 0),
('basic', 'Básico', 'Para negócios em crescimento', 29.90, 2000, 'price_1ShaIeCjIGOfNgffXczeafPR', 'prod_Teu6Hq16M0mYW1', '["Até 2.000 pedidos/mês", "Tudo do plano gratuito", "Cupons de desconto", "Relatórios avançados", "Suporte prioritário"]'::jsonb, 1),
('pro', 'Pro', 'Mais popular para empresas', 49.90, 5000, 'price_1ShaJDCjIGOfNgffUq4LolV2', 'prod_Teu7JJnhWCv9MX', '["Até 5.000 pedidos/mês", "Tudo do plano básico", "Múltiplos entregadores", "Integrações avançadas", "API personalizada"]'::jsonb, 2),
('enterprise', 'Enterprise', 'Para grandes operações', 99.90, -1, 'price_1ShaKMCjIGOfNgffSkn5Tlqi', 'prod_Teu8s4ks6y3g3T', '["Pedidos ilimitados", "Tudo do plano pro", "Gerente de conta dedicado", "SLA garantido", "Customizações sob demanda"]'::jsonb, 3);

-- Add trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();