-- Add driver_status column to track driver states more explicitly
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS driver_status text DEFAULT 'offline' CHECK (driver_status IN ('available', 'in_delivery', 'offline'));

-- Create function to auto-assign orders to available drivers
CREATE OR REPLACE FUNCTION public.auto_assign_driver()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  available_driver_id uuid;
BEGIN
  -- Only trigger when status changes to 'awaiting_driver' and no driver assigned
  IF NEW.status = 'awaiting_driver' AND NEW.delivery_driver_id IS NULL THEN
    -- Find first available driver for this company
    SELECT id INTO available_driver_id
    FROM delivery_drivers
    WHERE company_id = NEW.company_id
      AND is_active = true
      AND is_available = true
      AND driver_status = 'available'
    ORDER BY updated_at ASC -- FIFO - first available gets it
    LIMIT 1;
    
    -- Assign driver if found
    IF available_driver_id IS NOT NULL THEN
      NEW.delivery_driver_id := available_driver_id;
      
      -- Update driver status to in_delivery
      UPDATE delivery_drivers
      SET driver_status = 'in_delivery',
          is_available = false,
          updated_at = now()
      WHERE id = available_driver_id;
      
      -- Create notification for the driver
      INSERT INTO notifications (user_id, title, message, type, data)
      SELECT 
        dd.user_id,
        'Nova entrega atribuída!',
        'Você tem uma nova entrega para realizar. Pedido #' || LEFT(NEW.id::text, 8),
        'info',
        jsonb_build_object('type', 'new_delivery', 'order_id', NEW.id, 'company_id', NEW.company_id)
      FROM delivery_drivers dd
      WHERE dd.id = available_driver_id
        AND dd.user_id IS NOT NULL;
    END IF;
  END IF;
  
  -- When order is delivered, free up the driver
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.delivery_driver_id IS NOT NULL THEN
    UPDATE delivery_drivers
    SET driver_status = 'available',
        is_available = true,
        updated_at = now()
    WHERE id = NEW.delivery_driver_id;
  END IF;
  
  -- When order is cancelled, free up the driver
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.delivery_driver_id IS NOT NULL THEN
    UPDATE delivery_drivers
    SET driver_status = 'available',
        is_available = true,
        updated_at = now()
    WHERE id = NEW.delivery_driver_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for auto-assignment
DROP TRIGGER IF EXISTS trigger_auto_assign_driver ON orders;
CREATE TRIGGER trigger_auto_assign_driver
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_driver();

-- Also create trigger for INSERT when order is created with awaiting_driver status
DROP TRIGGER IF EXISTS trigger_auto_assign_driver_insert ON orders;
CREATE TRIGGER trigger_auto_assign_driver_insert
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'awaiting_driver')
  EXECUTE FUNCTION auto_assign_driver();

-- Create function to update driver status when they toggle availability
CREATE OR REPLACE FUNCTION public.sync_driver_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- When driver becomes unavailable, set to offline
  IF NEW.is_available = false AND OLD.is_available = true THEN
    IF NEW.driver_status = 'available' THEN
      NEW.driver_status := 'offline';
    END IF;
  END IF;
  
  -- When driver becomes available
  IF NEW.is_available = true AND OLD.is_available = false THEN
    -- Only set to available if not currently in delivery
    IF NEW.driver_status != 'in_delivery' THEN
      NEW.driver_status := 'available';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for driver status sync
DROP TRIGGER IF EXISTS trigger_sync_driver_status ON delivery_drivers;
CREATE TRIGGER trigger_sync_driver_status
  BEFORE UPDATE ON delivery_drivers
  FOR EACH ROW
  EXECUTE FUNCTION sync_driver_status();

-- Initialize existing drivers with correct status
UPDATE delivery_drivers
SET driver_status = CASE
  WHEN is_available = true AND is_active = true THEN 'available'
  WHEN is_available = false OR is_active = false THEN 'offline'
  ELSE 'offline'
END
WHERE driver_status IS NULL;