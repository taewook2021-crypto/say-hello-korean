-- Fix RLS policies for subjects table
DROP POLICY IF EXISTS "Users can manage their own subjects" ON public.subjects;

CREATE POLICY "Users can manage their own subjects" 
ON public.subjects 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix RLS policies for books table  
DROP POLICY IF EXISTS "Users can manage their own books" ON public.books;

CREATE POLICY "Users can manage their own books" 
ON public.books 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add debugging function to check auth status
CREATE OR REPLACE FUNCTION public.debug_auth_info()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'current_user', current_user
  );
$$;