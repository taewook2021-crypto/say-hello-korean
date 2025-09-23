-- Fix user data isolation issues

-- 1. Update subjects table to make user_id NOT NULL and fix unique constraints
ALTER TABLE public.subjects 
ALTER COLUMN user_id SET NOT NULL;

-- Drop old unique constraint and create new one that includes user_id
ALTER TABLE public.subjects 
DROP CONSTRAINT IF EXISTS subjects_name_key;

ALTER TABLE public.subjects 
ADD CONSTRAINT subjects_name_user_id_key UNIQUE (name, user_id);

-- 2. Update books table to make user_id NOT NULL and fix unique constraints  
ALTER TABLE public.books
ALTER COLUMN user_id SET NOT NULL;

-- Drop old unique constraint and create new one that includes user_id
ALTER TABLE public.books
DROP CONSTRAINT IF EXISTS books_name_subject_name_key;

ALTER TABLE public.books
ADD CONSTRAINT books_name_subject_name_user_id_key UNIQUE (name, subject_name, user_id);

-- 3. Update other tables to make user_id NOT NULL where needed
ALTER TABLE public.chapters
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.study_progress
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.pdf_attachments
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.major_chapters
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.wrong_notes
ALTER COLUMN user_id SET NOT NULL;

-- 4. Update RLS policies for proper user isolation

-- Update subjects RLS policies
DROP POLICY IF EXISTS "Allow anonymous access for development" ON public.subjects;
CREATE POLICY "Users can manage their own subjects" 
ON public.subjects 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update books RLS policies  
DROP POLICY IF EXISTS "Allow anonymous access for development" ON public.books;
CREATE POLICY "Users can manage their own books"
ON public.books
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update chapters RLS policies
DROP POLICY IF EXISTS "Allow anonymous access for development" ON public.chapters;
CREATE POLICY "Users can manage their own chapters"
ON public.chapters
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update wrong_notes RLS policies
DROP POLICY IF EXISTS "Allow all operations for development" ON public.wrong_notes;
CREATE POLICY "Users can manage their own wrong_notes"
ON public.wrong_notes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);