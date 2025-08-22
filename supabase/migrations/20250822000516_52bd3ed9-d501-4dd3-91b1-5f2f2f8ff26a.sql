-- summaries 테이블 정책도 임시로 수정 (개발/테스트용)
DROP POLICY IF EXISTS "Users can view their own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Users can create their own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Users can update their own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Users can delete their own summaries" ON public.summaries;

-- 임시 개발용 정책 (모든 접근 허용)
CREATE POLICY "Allow all access for development" 
ON public.summaries 
FOR ALL 
USING (true) 
WITH CHECK (true);