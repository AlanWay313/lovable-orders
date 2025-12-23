-- Create option groups table (e.g., "Tamanho", "Borda", "Sabores", "Adicionais")
CREATE TABLE public.product_option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  selection_type TEXT DEFAULT 'single' CHECK (selection_type IN ('single', 'multiple', 'half_half')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add group_id to product_options for grouping (nullable for backward compatibility)
ALTER TABLE public.product_options 
ADD COLUMN group_id UUID REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
ADD COLUMN description TEXT,
ADD COLUMN is_available BOOLEAN DEFAULT true,
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Enable RLS on product_option_groups
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view option groups of approved companies
CREATE POLICY "Anyone can view option groups of approved companies"
ON public.product_option_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products p
    JOIN companies c ON c.id = p.company_id
    WHERE p.id = product_option_groups.product_id
    AND c.status = 'approved'
  )
);

-- Policy: Owners can manage their option groups
CREATE POLICY "Owners can manage their option groups"
ON public.product_option_groups
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM products p
    JOIN companies c ON c.id = p.company_id
    WHERE p.id = product_option_groups.product_id
    AND c.owner_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_option_groups_product_id ON public.product_option_groups(product_id);
CREATE INDEX idx_product_options_group_id ON public.product_options(group_id);