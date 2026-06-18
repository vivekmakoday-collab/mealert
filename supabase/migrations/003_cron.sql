-- Requires pg_net and pg_cron extensions (enabled in Supabase Dashboard → Extensions)

select cron.schedule(
  'daily-meal-digest',
  '0 7 * * *',   -- 7am UTC (adjust if your family is in a different timezone)
  $$
  select net.http_post(
    url := current_setting('app.digest_url') || '/api/send-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret', current_setting('app.digest_secret')
    ),
    body := jsonb_build_object('family_id', current_setting('app.family_id'))
  )
  $$
);
