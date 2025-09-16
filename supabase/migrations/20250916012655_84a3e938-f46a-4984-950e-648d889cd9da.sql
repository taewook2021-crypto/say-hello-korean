-- Update RLS policies for study_progress to allow all access during development
DROP POLICY IF EXISTS "Users can view their own study progress" ON public.study_progress;
DROP POLICY IF EXISTS "Users can create their own study progress" ON public.study_progress;
DROP POLICY IF EXISTS "Users can update their own study progress" ON public.study_progress;
DROP POLICY IF EXISTS "Users can delete their own study progress" ON public.study_progress;

-- Create new policies that allow all access (like other tables)
CREATE POLICY "Allow all operations on study_progress for development" 
ON public.study_progress 
FOR ALL 
USING (true)
WITH CHECK (true);