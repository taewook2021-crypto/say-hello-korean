-- conversations 테이블 정책도 임시로 수정 (개발/테스트용)
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;

-- 임시 개발용 정책 (모든 접근 허용)
CREATE POLICY "Allow all access for development" 
ON public.conversations 
FOR ALL 
USING (true) 
WITH CHECK (true);