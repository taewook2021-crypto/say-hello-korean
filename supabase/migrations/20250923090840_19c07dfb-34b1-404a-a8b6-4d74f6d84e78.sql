-- 임시로 subjects 테이블의 RLS를 비활성화
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;

-- 임시로 books 테이블의 RLS를 비활성화  
ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;