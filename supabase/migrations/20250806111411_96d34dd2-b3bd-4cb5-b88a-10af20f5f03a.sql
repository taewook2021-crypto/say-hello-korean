-- Review schedule과 관련 테이블들의 RLS 정책을 user_id가 null인 경우에도 허용하도록 수정
-- 이는 현재 앱이 사용자 인증 없이 사용되고 있기 때문

-- review_schedule 테이블의 RLS 정책 수정
DROP POLICY IF EXISTS "Users can create their own review schedule" ON public.review_schedule;
DROP POLICY IF EXISTS "Users can update their own review schedule" ON public.review_schedule;
DROP POLICY IF EXISTS "Users can view their own review schedule" ON public.review_schedule;

CREATE POLICY "Allow all operations on review_schedule" 
ON public.review_schedule FOR ALL 
USING (true) 
WITH CHECK (true);

-- study_sessions 테이블의 RLS 정책 수정
DROP POLICY IF EXISTS "Users can create their own study sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can update their own study sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can view their own study sessions" ON public.study_sessions;

CREATE POLICY "Allow all operations on study_sessions" 
ON public.study_sessions FOR ALL 
USING (true) 
WITH CHECK (true);

-- memorization_checklist 테이블의 RLS 정책 수정
DROP POLICY IF EXISTS "Users can create their own memorization checklist" ON public.memorization_checklist;
DROP POLICY IF EXISTS "Users can update their own memorization checklist" ON public.memorization_checklist;
DROP POLICY IF EXISTS "Users can view their own memorization checklist" ON public.memorization_checklist;

CREATE POLICY "Allow all operations on memorization_checklist" 
ON public.memorization_checklist FOR ALL 
USING (true) 
WITH CHECK (true);