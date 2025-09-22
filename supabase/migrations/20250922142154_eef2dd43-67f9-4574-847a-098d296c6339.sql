-- Temporarily update RLS policies to allow anonymous access for development
-- This allows user_id to be null for easier data migration

-- Update subjects RLS policy
DROP POLICY IF EXISTS "Users can manage their own subjects" ON subjects;
CREATE POLICY "Allow anonymous access for development" ON subjects
  FOR ALL USING (true)
  WITH CHECK (true);

-- Update books RLS policy  
DROP POLICY IF EXISTS "Users can manage their own books" ON books;
CREATE POLICY "Allow anonymous access for development" ON books
  FOR ALL USING (true)
  WITH CHECK (true);

-- Update chapters RLS policy
DROP POLICY IF EXISTS "Users can manage their own chapters" ON chapters;
CREATE POLICY "Allow anonymous access for development" ON chapters
  FOR ALL USING (true)
  WITH CHECK (true);