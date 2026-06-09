DROP TRIGGER IF EXISTS prevent_role_self_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_role_self_escalation_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_self_escalation();