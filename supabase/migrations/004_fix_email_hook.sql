-- Fix email hook function — correct net.http_post call

CREATE OR REPLACE FUNCTION public.hook_send_email(event jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
BEGIN
  SELECT net.http_post(
    url     := 'https://gisfihwxixudfdwlbrkm.supabase.co/functions/v1/auth-hook-send-email',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := event
  ) INTO request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hook_send_email(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_send_email(jsonb) FROM PUBLIC;
