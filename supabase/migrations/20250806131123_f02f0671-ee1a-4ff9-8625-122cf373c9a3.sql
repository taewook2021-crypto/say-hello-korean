-- major_chapters 테이블에 updated_at 컬럼 추가
ALTER TABLE public.major_chapters 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- 기존 대단원 이름을 "재고자산 Ch3"로 변경
UPDATE public.major_chapters 
SET name = '재고자산 Ch3'
WHERE name = '재고자산' 
AND book_name = '최재형 연습서' 
AND subject_name = '재무회계';

-- 기존 소단원(Ch 3)을 삭제 (오답노트는 대단원으로 연결되도록)
DELETE FROM public.chapters 
WHERE name = 'Ch 3' 
AND book_name = '최재형 연습서' 
AND subject_name = '재무회계';

-- wrong_notes 테이블의 chapter_name을 "재고자산 Ch3"로 업데이트
UPDATE public.wrong_notes 
SET chapter_name = '재고자산 Ch3'
WHERE chapter_name = 'Ch 3 재고자산' 
AND book_name = '최재형 연습서' 
AND subject_name = '재무회계';