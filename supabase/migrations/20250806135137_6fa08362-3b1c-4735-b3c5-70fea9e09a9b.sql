-- 외래키 제약을 CASCADE로 변경하여 자동 업데이트 허용

-- 1. 기존 외래키 제약 삭제
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_subject_name_fkey;
ALTER TABLE major_chapters DROP CONSTRAINT IF EXISTS major_chapters_subject_name_fkey;
ALTER TABLE major_chapters DROP CONSTRAINT IF EXISTS major_chapters_book_name_fkey;
ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_subject_name_fkey;
ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_book_name_fkey;
ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_book_name_subject_name_fkey;

-- 2. CASCADE 옵션으로 외래키 제약 다시 생성
-- books 테이블의 subject_name이 subjects.name을 참조
ALTER TABLE books 
ADD CONSTRAINT books_subject_name_fkey 
FOREIGN KEY (subject_name) 
REFERENCES subjects(name) 
ON UPDATE CASCADE 
ON DELETE CASCADE;

-- major_chapters 테이블의 subject_name이 subjects.name을 참조
ALTER TABLE major_chapters 
ADD CONSTRAINT major_chapters_subject_name_fkey 
FOREIGN KEY (subject_name) 
REFERENCES subjects(name) 
ON UPDATE CASCADE 
ON DELETE CASCADE;

-- major_chapters 테이블의 book_name이 books.name을 참조 (복합키)
ALTER TABLE major_chapters 
ADD CONSTRAINT major_chapters_book_subject_fkey 
FOREIGN KEY (book_name, subject_name) 
REFERENCES books(name, subject_name) 
ON UPDATE CASCADE 
ON DELETE CASCADE;

-- chapters 테이블의 subject_name이 subjects.name을 참조
ALTER TABLE chapters 
ADD CONSTRAINT chapters_subject_name_fkey 
FOREIGN KEY (subject_name) 
REFERENCES subjects(name) 
ON UPDATE CASCADE 
ON DELETE CASCADE;

-- chapters 테이블의 book_name이 books.name을 참조 (복합키)
ALTER TABLE chapters 
ADD CONSTRAINT chapters_book_subject_fkey 
FOREIGN KEY (book_name, subject_name) 
REFERENCES books(name, subject_name) 
ON UPDATE CASCADE 
ON DELETE CASCADE;