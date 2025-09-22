-- Update RLS policy for wrong_notes table to allow development mode inserts
DROP POLICY IF EXISTS "Users can manage their own wrong_notes" ON public.wrong_notes;

CREATE POLICY "Allow all operations for development"
ON public.wrong_notes
FOR ALL
USING (true)
WITH CHECK (true);