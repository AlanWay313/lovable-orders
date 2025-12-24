-- Add sort_order column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Update existing products with initial sort order based on created_at
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at) as rn
  FROM public.products
)
UPDATE public.products p
SET sort_order = r.rn
FROM ranked r
WHERE p.id = r.id;