-- Fix RLS policies to ensure proper authentication requirements
-- Update policies to be more restrictive and require authenticated users

-- Update wrong_notes policies to only allow authenticated users
DROP POLICY IF EXISTS "Users can manage their own wrong_notes" ON public.wrong_notes;
CREATE POLICY "Users can manage their own wrong_notes" 
ON public.wrong_notes 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update chapters policies to only allow authenticated users  
DROP POLICY IF EXISTS "Users can manage their own chapters" ON public.chapters;
CREATE POLICY "Users can manage their own chapters" 
ON public.chapters 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update books policies to only allow authenticated users
DROP POLICY IF EXISTS "Users can manage their own books" ON public.books;
CREATE POLICY "Users can manage their own books" 
ON public.books 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update subjects policies to only allow authenticated users
DROP POLICY IF EXISTS "Users can manage their own subjects" ON public.subjects;
CREATE POLICY "Users can manage their own subjects" 
ON public.subjects 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);