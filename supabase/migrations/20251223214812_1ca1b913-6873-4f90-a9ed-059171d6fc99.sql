-- Function to increment order count when order is confirmed
CREATE OR REPLACE FUNCTION public.increment_company_order_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_record RECORD;
  order_limit INTEGER;
BEGIN
  -- Only increment when order is confirmed (status changes from pending to confirmed)
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status = 'pending') THEN
    -- Get company data
    SELECT 
      c.subscription_status, 
      c.subscription_plan,
      c.monthly_order_count,
      c.order_count_reset_date
    INTO company_record
    FROM companies c
    WHERE c.id = NEW.company_id;
    
    -- Reset count if new month
    IF company_record.order_count_reset_date IS NULL OR 
       date_trunc('month', company_record.order_count_reset_date) < date_trunc('month', now()) THEN
      UPDATE companies 
      SET monthly_order_count = 0, order_count_reset_date = now()
      WHERE id = NEW.company_id;
      company_record.monthly_order_count := 0;
    END IF;
    
    -- Determine order limit based on plan
    CASE company_record.subscription_plan
      WHEN 'basic' THEN order_limit := 2000;
      WHEN 'pro' THEN order_limit := 5000;
      WHEN 'enterprise' THEN order_limit := -1; -- unlimited
      ELSE order_limit := 1000; -- free plan
    END CASE;
    
    -- Check if limit exceeded (skip if unlimited)
    IF order_limit != -1 AND company_record.monthly_order_count >= order_limit THEN
      -- Create notification for company owner
      INSERT INTO notifications (user_id, title, message, type, data)
      SELECT 
        c.owner_id,
        'Limite de pedidos atingido!',
        'Você atingiu o limite de ' || order_limit || ' pedidos do seu plano. Faça upgrade para continuar recebendo pedidos.',
        'warning',
        jsonb_build_object('type', 'order_limit', 'plan', COALESCE(company_record.subscription_plan, 'free'))
      FROM companies c
      WHERE c.id = NEW.company_id;
      
      RAISE EXCEPTION 'Limite de pedidos do plano atingido. Faça upgrade para continuar.';
    END IF;
    
    -- Increment order count
    UPDATE companies 
    SET monthly_order_count = COALESCE(monthly_order_count, 0) + 1
    WHERE id = NEW.company_id;
    
    -- Notify when approaching limit (80%)
    IF order_limit != -1 AND (company_record.monthly_order_count + 1) >= (order_limit * 0.8) 
       AND (company_record.monthly_order_count + 1) < order_limit THEN
      INSERT INTO notifications (user_id, title, message, type, data)
      SELECT 
        c.owner_id,
        'Você está próximo do limite!',
        'Você usou ' || (company_record.monthly_order_count + 1) || ' de ' || order_limit || ' pedidos do mês. Considere fazer upgrade.',
        'info',
        jsonb_build_object('type', 'order_limit_warning', 'usage', company_record.monthly_order_count + 1, 'limit', order_limit)
      FROM companies c
      WHERE c.id = NEW.company_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_increment_order_count ON orders;
CREATE TRIGGER trigger_increment_order_count
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_company_order_count();