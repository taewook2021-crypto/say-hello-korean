-- Add status field to study_progress table to track O/△/X states
ALTER TABLE public.study_progress 
ADD COLUMN status text DEFAULT null;

-- Add check constraint for valid status values
ALTER TABLE public.study_progress 
ADD CONSTRAINT valid_status_values 
CHECK (status IS NULL OR status IN ('correct', 'mistake', 'wrong'));