-- Fix existing NULL user_id values and then apply constraints

-- First, let's see what we're dealing with
-- We'll use a placeholder user_id for existing NULL records
-- In a real scenario, you'd want to either delete these records or assign them to a specific user

-- Generate a placeholder UUID for orphaned records
DO $$ 
DECLARE
    placeholder_user_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Update NULL user_id values in subjects table
    UPDATE public.subjects 
    SET user_id = placeholder_user_id 
    WHERE user_id IS NULL;
    
    -- Update NULL user_id values in books table
    UPDATE public.books
    SET user_id = placeholder_user_id 
    WHERE user_id IS NULL;
    
    -- Update NULL user_id values in chapters table
    UPDATE public.chapters
    SET user_id = placeholder_user_id 
    WHERE user_id IS NULL;
    
    -- Update NULL user_id values in study_progress table
    UPDATE public.study_progress
    SET user_id = placeholder_user_id 
    WHERE user_id IS NULL;
    
    -- Update NULL user_id values in pdf_attachments table
    UPDATE public.pdf_attachments
    SET user_id = placeholder_user_id 
    WHERE user_id IS NULL;
    
    -- Update NULL user_id values in major_chapters table
    UPDATE public.major_chapters
    SET user_id = placeholder_user_id 
    WHERE user_id IS NULL;
    
    -- Update NULL user_id values in wrong_notes table
    UPDATE public.wrong_notes
    SET user_id = placeholder_user_id 
    WHERE user_id IS NULL;
END $$;

-- Now apply the NOT NULL constraints
ALTER TABLE public.subjects ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.books ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.chapters ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.study_progress ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.pdf_attachments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.major_chapters ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.wrong_notes ALTER COLUMN user_id SET NOT NULL;

-- Update unique constraints to include user_id
ALTER TABLE public.subjects 
DROP CONSTRAINT IF EXISTS subjects_name_key;
ALTER TABLE public.subjects 
ADD CONSTRAINT subjects_name_user_id_key UNIQUE (name, user_id);

ALTER TABLE public.books
DROP CONSTRAINT IF EXISTS books_name_subject_name_key;
ALTER TABLE public.books
ADD CONSTRAINT books_name_subject_name_user_id_key UNIQUE (name, subject_name, user_id);