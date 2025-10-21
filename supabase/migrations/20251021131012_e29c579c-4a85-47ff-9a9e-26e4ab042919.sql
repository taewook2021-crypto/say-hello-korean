-- Add quiz_config column to wrong_notes table for storing quiz configuration
ALTER TABLE public.wrong_notes 
ADD COLUMN IF NOT EXISTS quiz_config jsonb DEFAULT NULL;