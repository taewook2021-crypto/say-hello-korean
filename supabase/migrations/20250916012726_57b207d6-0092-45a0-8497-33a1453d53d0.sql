-- Remove user_id column from study_progress table since auth is not implemented
ALTER TABLE public.study_progress DROP COLUMN IF EXISTS user_id;