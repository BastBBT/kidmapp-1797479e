CREATE TABLE public.telegram_inbox (
  update_id bigint PRIMARY KEY,
  chat_id bigint NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  fired_at timestamptz NULL
);
GRANT ALL ON public.telegram_inbox TO service_role;
ALTER TABLE public.telegram_inbox ENABLE ROW LEVEL SECURITY;
CREATE INDEX telegram_inbox_pending_chat_idx ON public.telegram_inbox (chat_id) WHERE fired_at IS NULL;

CREATE FUNCTION public.telegram_relay_claim(p_chat_id bigint)
RETURNS TABLE(update_id bigint, payload jsonb)
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH reserved AS (
    UPDATE public.telegram_inbox AS inbox
    SET fired_at = now()
    WHERE inbox.chat_id = p_chat_id AND inbox.fired_at IS NULL
    RETURNING inbox.update_id, inbox.payload
  )
  SELECT reserved.update_id, reserved.payload FROM reserved ORDER BY reserved.update_id;
$$;
REVOKE ALL ON FUNCTION public.telegram_relay_claim(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_relay_claim(bigint) TO service_role;