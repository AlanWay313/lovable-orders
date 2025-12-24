-- Drop the existing check constraint and recreate with all valid status values
ALTER TABLE public.delivery_drivers DROP CONSTRAINT IF EXISTS delivery_drivers_driver_status_check;

-- Add the correct check constraint with all valid statuses
ALTER TABLE public.delivery_drivers ADD CONSTRAINT delivery_drivers_driver_status_check 
CHECK (driver_status IN ('offline', 'available', 'pending_acceptance', 'in_delivery'));