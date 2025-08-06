-- 재고자산 대단원 생성
INSERT INTO public.major_chapters (name, book_name, subject_name)
VALUES ('재고자산', '최재형 연습서', '재무회계');

-- 방금 생성된 대단원의 ID를 가져와서 기존 chapters 업데이트
WITH new_major_chapter AS (
  SELECT id FROM public.major_chapters 
  WHERE name = '재고자산' 
  AND book_name = '최재형 연습서' 
  AND subject_name = '재무회계'
)
UPDATE public.chapters 
SET 
  name = 'Ch 3',
  major_chapter_id = (SELECT id FROM new_major_chapter)
WHERE 
  name = 'Ch 3 재고자산' 
  AND book_name = '최재형 연습서' 
  AND subject_name = '재무회계';