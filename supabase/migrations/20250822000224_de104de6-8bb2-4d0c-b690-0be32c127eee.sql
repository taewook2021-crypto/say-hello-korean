-- 기존 정책들을 삭제하고 임시로 모든 액세스 허용 (개발/테스트용)
DROP POLICY IF EXISTS "Users can view their own nodes" ON public.nodes;
DROP POLICY IF EXISTS "Users can create their own nodes" ON public.nodes;
DROP POLICY IF EXISTS "Users can update their own nodes" ON public.nodes;
DROP POLICY IF EXISTS "Users can delete their own nodes" ON public.nodes;

-- 임시 개발용 정책 (모든 접근 허용)
CREATE POLICY "Allow all access for development" 
ON public.nodes 
FOR ALL 
USING (true) 
WITH CHECK (true);