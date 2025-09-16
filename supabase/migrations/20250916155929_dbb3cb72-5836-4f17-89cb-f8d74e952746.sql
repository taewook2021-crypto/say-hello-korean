-- Add user_id to existing tables for user data separation
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.major_chapters ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.wrong_notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.study_progress ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.pdf_attachments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for user-specific data access
DROP POLICY IF EXISTS "Allow all access to subjects" ON public.subjects;
CREATE POLICY "Users can manage their own subjects" 
ON public.subjects 
FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow all access to books" ON public.books;
CREATE POLICY "Users can manage their own books" 
ON public.books 
FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow all access to chapters" ON public.chapters;
CREATE POLICY "Users can manage their own chapters" 
ON public.chapters 
FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow all access to major_chapters" ON public.major_chapters;
CREATE POLICY "Users can manage their own major_chapters" 
ON public.major_chapters 
FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow all access to wrong_notes" ON public.wrong_notes;
CREATE POLICY "Users can manage their own wrong_notes" 
ON public.wrong_notes 
FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow all operations on study_progress for development" ON public.study_progress;
CREATE POLICY "Users can manage their own study_progress" 
ON public.study_progress 
FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow all access to pdf_attachments" ON public.pdf_attachments;
CREATE POLICY "Users can manage their own pdf_attachments" 
ON public.pdf_attachments 
FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);