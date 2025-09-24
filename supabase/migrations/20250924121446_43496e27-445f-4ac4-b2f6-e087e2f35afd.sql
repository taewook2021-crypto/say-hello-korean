-- 기존 constraint 존재 여부 확인 후 조건부로 추가

-- subjects 테이블 constraint 추가 (이미 존재할 수 있음)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subjects_user_id_name_unique'
    ) THEN
        ALTER TABLE public.subjects ADD CONSTRAINT subjects_user_id_name_unique UNIQUE (user_id, name);
    END IF;
END $$;

-- books 테이블 constraint 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'books_user_id_subject_name_name_unique'
    ) THEN
        ALTER TABLE public.books ADD CONSTRAINT books_user_id_subject_name_name_unique UNIQUE (user_id, subject_name, name);
    END IF;
END $$;

-- chapters 테이블 constraint 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chapters_user_id_subject_name_book_name_name_unique'
    ) THEN
        ALTER TABLE public.chapters ADD CONSTRAINT chapters_user_id_subject_name_book_name_name_unique UNIQUE (user_id, subject_name, book_name, name);
    END IF;
END $$;

-- major_chapters 테이블 constraint 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'major_chapters_user_id_subject_name_book_name_name_unique'
    ) THEN
        ALTER TABLE public.major_chapters ADD CONSTRAINT major_chapters_user_id_subject_name_book_name_name_unique UNIQUE (user_id, subject_name, book_name, name);
    END IF;
END $$;