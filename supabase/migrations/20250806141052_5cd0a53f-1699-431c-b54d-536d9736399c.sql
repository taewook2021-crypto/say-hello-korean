-- 오답노트의 chapter_name을 "재고자산"으로 변경 (URL과 일치시키기 위해)
UPDATE wrong_notes 
SET chapter_name = '재고자산'
WHERE book_name = '최재형 연습서' 
AND subject_name = '재무회계'
AND chapter_name = '재고자산 Ch3';

-- chapters 테이블에서도 동일하게 변경
UPDATE chapters 
SET name = '재고자산'
WHERE book_name = '최재형 연습서' 
AND subject_name = '재무회계'
AND name = '재고자산 Ch3';