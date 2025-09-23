-- Clean up orphaned records first
DELETE FROM public.subjects WHERE user_id IS NULL;
DELETE FROM public.books WHERE user_id IS NULL;
DELETE FROM public.chapters WHERE user_id IS NULL;
DELETE FROM public.study_progress WHERE user_id IS NULL;
DELETE FROM public.pdf_attachments WHERE user_id IS NULL;
DELETE FROM public.major_chapters WHERE user_id IS NULL;
DELETE FROM public.wrong_notes WHERE user_id IS NULL;

-- Apply NOT NULL constraints
ALTER TABLE public.subjects ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.books ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.chapters ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.study_progress ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.pdf_attachments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.major_chapters ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.wrong_notes ALTER COLUMN user_id SET NOT NULL;

-- Drop the old unique constraint with CASCADE to remove dependencies
ALTER TABLE public.subjects 
DROP CONSTRAINT subjects_name_key CASCADE;

-- Add new unique constraint that includes user_id
ALTER TABLE public.subjects 
ADD CONSTRAINT subjects_name_user_id_key UNIQUE (name, user_id);

-- Drop and recreate the books constraint
ALTER TABLE public.books
DROP CONSTRAINT IF EXISTS books_name_subject_name_key;
ALTER TABLE public.books
ADD CONSTRAINT books_name_subject_name_user_id_key UNIQUE (name, subject_name, user_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Allow anonymous access for development" ON public.subjects;
CREATE POLICY "Users can manage their own subjects" 
ON public.subjects 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow anonymous access for development" ON public.books;
CREATE POLICY "Users can manage their own books"
ON public.books
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow anonymous access for development" ON public.chapters;
CREATE POLICY "Users can manage their own chapters"
ON public.chapters
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow all operations for development" ON public.wrong_notes;
CREATE POLICY "Users can manage their own wrong_notes"
ON public.wrong_notes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);