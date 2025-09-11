-- PDF 첨부 테이블에서 book_name과 chapter_name을 nullable로 변경
ALTER TABLE public.pdf_attachments 
ALTER COLUMN book_name DROP NOT NULL,
ALTER COLUMN chapter_name DROP NOT NULL;