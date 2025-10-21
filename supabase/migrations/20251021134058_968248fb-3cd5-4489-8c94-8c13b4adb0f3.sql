-- Add problem_number column to wrong_notes table
ALTER TABLE public.wrong_notes 
ADD COLUMN IF NOT EXISTS problem_number integer DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_wrong_notes_problem_number 
ON public.wrong_notes(problem_number);

-- Update wrong_notes_backup table as well
ALTER TABLE public.wrong_notes_backup
ADD COLUMN IF NOT EXISTS problem_number integer DEFAULT NULL;