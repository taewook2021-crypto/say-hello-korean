-- nodes 테이블에 CREATE 정책 추가 (누락된 정책)
CREATE POLICY "Users can create their own nodes" 
ON public.nodes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Anonymous 사용자를 위한 임시 정책 (개발/테스트 목적)
-- 실제 프로덕션에서는 제거해야 함
CREATE POLICY "Allow anonymous access for testing" 
ON public.nodes 
FOR ALL 
USING (true) 
WITH CHECK (true);