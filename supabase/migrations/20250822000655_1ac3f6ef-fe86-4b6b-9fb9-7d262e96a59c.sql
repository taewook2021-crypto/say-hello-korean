-- 모든 주요 테이블의 RLS 정책을 임시 개발용으로 수정 (고유한 이름 사용)

-- qa_pairs 테이블
DROP POLICY IF EXISTS "Users can view their own qa_pairs" ON public.qa_pairs;
DROP POLICY IF EXISTS "Users can create their own qa_pairs" ON public.qa_pairs;
DROP POLICY IF EXISTS "Users can update their own qa_pairs" ON public.qa_pairs;
DROP POLICY IF EXISTS "Users can delete their own qa_pairs" ON public.qa_pairs;

CREATE POLICY "Allow all access for qa_pairs development" 
ON public.qa_pairs 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- node_archives 테이블
DROP POLICY IF EXISTS "Users can view their own node archives" ON public.node_archives;
DROP POLICY IF EXISTS "Users can create their own node archives" ON public.node_archives;
DROP POLICY IF EXISTS "Users can update their own node archives" ON public.node_archives;
DROP POLICY IF EXISTS "Users can delete their own node archives" ON public.node_archives;

CREATE POLICY "Allow all access for node_archives development" 
ON public.node_archives 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- profiles 테이블
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Allow all access for profiles development" 
ON public.profiles 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- cards 테이블
DROP POLICY IF EXISTS "Users can view their own cards" ON public.cards;
DROP POLICY IF EXISTS "Users can create their own cards" ON public.cards;
DROP POLICY IF EXISTS "Users can update their own cards" ON public.cards;
DROP POLICY IF EXISTS "Users can delete their own cards" ON public.cards;

CREATE POLICY "Allow all access for cards development" 
ON public.cards 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- subscribers 테이블
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscribers;

CREATE POLICY "Allow all access for subscribers development" 
ON public.subscribers 
FOR ALL 
USING (true) 
WITH CHECK (true);