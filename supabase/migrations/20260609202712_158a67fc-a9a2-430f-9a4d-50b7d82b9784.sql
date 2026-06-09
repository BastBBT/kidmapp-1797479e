
REVOKE EXECUTE ON FUNCTION public.award_points(UUID, INT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_contribution_validated_points() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_proposal_approved_points() FROM PUBLIC, anon, authenticated;
