-- Postgres hook function for Supabase Auth "Send Email" hook
-- Calls the auth-hook-send-email edge function via pg_net (no secret needed)

CREATE OR REPLACE FUNCTION public.hook_send_email(event jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://gisfihwxixudfdwlbrkm.supabase.co/functions/v1/auth-hook-send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body    := event::text
  );
END;
$$;

-- Grant execute to the auth admin role so Supabase Auth can call it
GRANT EXECUTE ON FUNCTION public.hook_send_email(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_send_email(jsonb) FROM PUBLIC;
