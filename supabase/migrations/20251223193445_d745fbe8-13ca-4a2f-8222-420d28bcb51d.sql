-- Add email column to delivery_drivers for linking with user accounts
ALTER TABLE public.delivery_drivers ADD COLUMN IF NOT EXISTS email text;

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_email ON public.delivery_drivers(email);

-- Function to auto-link driver when user logs in with matching email
CREATE OR REPLACE FUNCTION public.link_driver_on_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update any driver records with matching email to link to this user
  UPDATE public.delivery_drivers
  SET user_id = NEW.id,
      updated_at = now()
  WHERE email = NEW.email
    AND user_id IS NULL;
  
  -- Also add driver role if they were linked
  IF EXISTS (SELECT 1 FROM public.delivery_drivers WHERE user_id = NEW.id AND is_active = true) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'delivery_driver')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to run on new user creation
DROP TRIGGER IF EXISTS on_auth_user_created_link_driver ON auth.users;
CREATE TRIGGER on_auth_user_created_link_driver
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_driver_on_login();