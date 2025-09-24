-- 모든 관련 외래 키 제약조건들을 삭제하고 unique constraint를 수정

-- 1. 모든 외래 키 제약조건 삭제
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_subject_name_fkey;
ALTER TABLE public.major_chapters DROP CONSTRAINT IF EXISTS major_chapters_subject_name_fkey;
ALTER TABLE public.major_chapters DROP CONSTRAINT IF EXISTS major_chapters_book_subject_fkey;
ALTER TABLE public.chapters DROP CONSTRAINT IF EXISTS chapters_subject_name_fkey;
ALTER TABLE public.chapters DROP CONSTRAINT IF EXISTS chapters_book_subject_fkey;

-- 2. subjects 테이블의 unique constraint 수정
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_name_key CASCADE;

-- 3. books 테이블의 unique constraint 수정
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_name_subject_name_key CASCADE;

-- 4. chapters 테이블의 unique constraint 수정
ALTER TABLE public.chapters DROP CONSTRAINT IF EXISTS chapters_name_subject_name_book_name_key CASCADE;

-- 5. major_chapters 테이블의 unique constraint 수정
ALTER TABLE public.major_chapters DROP CONSTRAINT IF EXISTS major_chapters_name_subject_name_book_name_key CASCADE;

-- 6. 새로운 사용자별 unique constraint 추가
ALTER TABLE public.subjects ADD CONSTRAINT subjects_user_id_name_unique UNIQUE (user_id, name);
ALTER TABLE public.books ADD CONSTRAINT books_user_id_subject_name_name_unique UNIQUE (user_id, subject_name, name);
ALTER TABLE public.chapters ADD CONSTRAINT chapters_user_id_subject_name_book_name_name_unique UNIQUE (user_id, subject_name, book_name, name);
ALTER TABLE public.major_chapters ADD CONSTRAINT major_chapters_user_id_subject_name_book_name_name_unique UNIQUE (user_id, subject_name, book_name, name);