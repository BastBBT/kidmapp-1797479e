
-- Ensure pg_net is available for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Async notification helper: posts to the notify-validation edge function
CREATE OR REPLACE FUNCTION public.notify_validation_async(
  record_type text,
  record_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_service_key text;
  v_url text := 'https://rcwepnqjyowlbtmltwxo.supabase.co/functions/v1/notify-validation';
BEGIN
  BEGIN
    SELECT decrypted_secret
    INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'email_queue_service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  IF v_service_key IS NULL THEN
    RAISE WARNING 'notify_validation_async: missing service role key in vault';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('type', record_type, 'recordId', record_id)
  );
END;
$$;

-- Trigger function for contributions
CREATE OR REPLACE FUNCTION public.on_contribution_validated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'validated'
     AND COALESCE(OLD.status, '') <> 'validated'
     AND NEW.user_id IS NOT NULL THEN
    PERFORM public.notify_validation_async('contribution', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function for proposals
CREATE OR REPLACE FUNCTION public.on_proposal_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved'
     AND COALESCE(OLD.status, '') <> 'approved'
     AND NEW.user_id IS NOT NULL THEN
    PERFORM public.notify_validation_async('proposal', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contribution_validated ON public.contributions;
CREATE TRIGGER trg_contribution_validated
AFTER UPDATE ON public.contributions
FOR EACH ROW
EXECUTE FUNCTION public.on_contribution_validated();

DROP TRIGGER IF EXISTS trg_proposal_approved ON public.location_proposals;
CREATE TRIGGER trg_proposal_approved
AFTER UPDATE ON public.location_proposals
FOR EACH ROW
EXECUTE FUNCTION public.on_proposal_approved();
