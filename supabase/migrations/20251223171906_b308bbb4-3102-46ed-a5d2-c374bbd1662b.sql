-- Add name and phone columns to delivery_drivers for drivers without user accounts
ALTER TABLE public.delivery_drivers 
ADD COLUMN IF NOT EXISTS driver_name text,
ADD COLUMN IF NOT EXISTS driver_phone text;

-- Make user_id optional (nullable) for drivers added directly
ALTER TABLE public.delivery_drivers 
ALTER COLUMN user_id DROP NOT NULL;