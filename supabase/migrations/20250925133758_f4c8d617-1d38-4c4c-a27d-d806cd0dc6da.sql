-- Add multiple_choice_options column to wrong_notes table
ALTER TABLE public.wrong_notes 
ADD COLUMN multiple_choice_options JSONB DEFAULT NULL;

-- Add a comment to explain the structure
COMMENT ON COLUMN public.wrong_notes.multiple_choice_options IS 'JSON array containing multiple choice options: [{"text": "option1", "is_correct": true}, {"text": "option2", "is_correct": false}, ...]';