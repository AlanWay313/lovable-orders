-- Add location tracking columns to delivery_drivers
ALTER TABLE public.delivery_drivers
ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;

-- Enable realtime for delivery_drivers location updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_drivers;