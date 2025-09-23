-- 🚨 SECURITY FIX: Enable RLS and create policies (avoiding duplicates)

-- 1. Enable RLS on remaining tables
DO $$
BEGIN
    -- Enable RLS safely (ignore if already enabled)
    ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.memorization_checklist ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.review_schedule ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
    -- Continue if already enabled
    NULL;
END $$;

-- 2. Remove dangerous development policies
DROP POLICY IF EXISTS "Allow all operations on items for development" ON public.items;
DROP POLICY IF EXISTS "Allow all operations on memorization_checklist" ON public.memorization_checklist;
DROP POLICY IF EXISTS "Allow all access for development" ON public.nodes;
DROP POLICY IF EXISTS "Allow anonymous access for iframe testing" ON public.nodes;
DROP POLICY IF EXISTS "Allow all operations on review_schedule" ON public.review_schedule;
DROP POLICY IF EXISTS "Allow all operations on study_sessions" ON public.study_sessions;

-- 3. Create secure policies (drop first if exists)
DROP POLICY IF EXISTS "Users can manage their own items" ON public.items;
CREATE POLICY "Users can manage their own items"
ON public.items
FOR ALL
USING (project_id IN (
  SELECT id FROM nodes WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can manage their own memorization_checklist" ON public.memorization_checklist;
CREATE POLICY "Users can manage their own memorization_checklist"
ON public.memorization_checklist
FOR ALL
USING (wrong_note_id IN (
  SELECT id FROM wrong_notes WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can manage their own nodes" ON public.nodes;
CREATE POLICY "Users can manage their own nodes"
ON public.nodes
FOR ALL
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own review_schedule" ON public.review_schedule;
CREATE POLICY "Users can manage their own review_schedule"
ON public.review_schedule
FOR ALL
USING (wrong_note_id IN (
  SELECT id FROM wrong_notes WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can manage their own study_sessions" ON public.study_sessions;
CREATE POLICY "Users can manage their own study_sessions"
ON public.study_sessions
FOR ALL
USING (wrong_note_id IN (
  SELECT id FROM wrong_notes WHERE user_id = auth.uid()
));