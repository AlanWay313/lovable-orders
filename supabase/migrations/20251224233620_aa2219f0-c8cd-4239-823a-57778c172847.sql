-- Update auto_assign_driver function to use awaiting_driver status
CREATE OR REPLACE FUNCTION public.auto_assign_driver()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
      
      -- Update driver status to pending_acceptance (waiting for driver to accept)
      UPDATE delivery_drivers
      SET driver_status = 'pending_acceptance',
          is_available = false,
          updated_at = now()
      WHERE id = available_driver_id;
      
      -- Create notification for the driver
      INSERT INTO notifications (user_id, title, message, type, data)
      SELECT 
        dd.user_id,
        'Nova entrega disponível!',
        'Você tem uma nova entrega aguardando aceite. Pedido #' || LEFT(NEW.id::text, 8),
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