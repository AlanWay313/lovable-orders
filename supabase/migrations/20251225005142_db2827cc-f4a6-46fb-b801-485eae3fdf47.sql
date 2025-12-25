-- Create order_reviews table for customer satisfaction ratings
CREATE TABLE public.order_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  food_rating INTEGER CHECK (food_rating >= 1 AND food_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable RLS
ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can create a review (public - no auth required for customer reviews)
CREATE POLICY "Anyone can create reviews"
ON public.order_reviews
FOR INSERT
WITH CHECK (true);

-- Anyone can view reviews by order_id (for showing existing review)
CREATE POLICY "Anyone can view reviews"
ON public.order_reviews
FOR SELECT
USING (true);

-- Company owners can view their reviews
CREATE POLICY "Company owners can view their reviews"
ON public.order_reviews
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM companies
  WHERE companies.id = order_reviews.company_id
  AND companies.owner_id = auth.uid()
));

-- Add index for faster lookups
CREATE INDEX idx_order_reviews_order_id ON public.order_reviews(order_id);
CREATE INDEX idx_order_reviews_company_id ON public.order_reviews(company_id);