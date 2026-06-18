-- Evening prep-reminder job. Fires at 6pm and emails the family only when
-- tomorrow's planned meals have prep-ahead instructions (the route no-ops otherwise).
-- Requires pg_cron + pg_net (already enabled for the digest job).

select cron.schedule(
  'evening-prep-reminder',
  '0 18 * * *',   -- 6pm UTC (adjust to your family's evening)
  $$
  select net.http_post(
    url := current_setting('app.digest_url') || '/api/send-prep-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret', current_setting('app.digest_secret')
    ),
    body := jsonb_build_object('family_id', current_setting('app.family_id'))
  )
  $$
);
