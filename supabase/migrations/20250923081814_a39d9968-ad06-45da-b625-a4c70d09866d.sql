-- Step by step approach to handle foreign key constraints

-- 1. First, let's clean up NULL user_id data
DELETE FROM public.subjects WHERE user_id IS NULL;
DELETE FROM public.books WHERE user_id IS NULL;
DELETE FROM public.chapters WHERE user_id IS NULL;
DELETE FROM public.study_progress WHERE user_id IS NULL;
DELETE FROM public.pdf_attachments WHERE user_id IS NULL;
DELETE FROM public.major_chapters WHERE user_id IS NULL;
DELETE FROM public.wrong_notes WHERE user_id IS NULL;

-- 2. Make user_id NOT NULL
ALTER TABLE public.subjects ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.books ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.chapters ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.study_progress ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.pdf_attachments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.major_chapters ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.wrong_notes ALTER COLUMN user_id SET NOT NULL;

-- 3. Update RLS policies for user isolation
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