-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily comprehensive backup to run every day at 2 AM UTC
SELECT cron.schedule(
  'comprehensive-daily-backup',
  '0 2 * * *', -- Every day at 2 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://xzuxqgnackvqwyvrymtl.supabase.co/functions/v1/daily-backup',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dXhxZ25hY2t2cXd5dnJ5bXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzA5OTksImV4cCI6MjA2OTY0Njk5OX0.wIyF9Nb3veQepYcpXxgkNHMctOlu6yLZld5nGL94l80"}'::jsonb,
        body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Create a function to check backup health and send alerts if needed
CREATE OR REPLACE FUNCTION public.check_backup_health()
RETURNS TABLE(
    user_id UUID,
    last_backup_date DATE,
    days_since_last_backup INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        COALESCE(cdb.last_backup, '1970-01-01'::date) as last_backup_date,
        (CURRENT_DATE - COALESCE(cdb.last_backup, '1970-01-01'::date))::INTEGER as days_since_last_backup,
        CASE 
            WHEN cdb.last_backup IS NULL THEN 'NO_BACKUP'
            WHEN (CURRENT_DATE - cdb.last_backup) > 7 THEN 'STALE'
            WHEN (CURRENT_DATE - cdb.last_backup) > 2 THEN 'WARNING'
            ELSE 'HEALTHY'
        END as status
    FROM public.profiles p
    LEFT JOIN (
        SELECT 
            user_id,
            MAX(backup_date) as last_backup
        FROM public.comprehensive_daily_backup 
        GROUP BY user_id
    ) cdb ON p.id = cdb.user_id
    ORDER BY days_since_last_backup DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Schedule weekly backup health check
SELECT cron.schedule(
  'weekly-backup-health-check',
  '0 9 * * 1', -- Every Monday at 9 AM UTC
  $$
  SELECT public.check_backup_health();
  $$
);