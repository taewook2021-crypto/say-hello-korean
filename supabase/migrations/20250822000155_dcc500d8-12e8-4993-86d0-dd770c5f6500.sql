-- 개발/테스트를 위해 임시 정책 추가 (Anonymous 허용)
CREATE POLICY "Allow anonymous access for iframe testing" 
ON public.nodes 
FOR ALL 
USING (true) 
WITH CHECK (true);