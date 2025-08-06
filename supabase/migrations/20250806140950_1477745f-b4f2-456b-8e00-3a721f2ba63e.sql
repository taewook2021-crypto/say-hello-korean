-- 기존 오답노트들의 subject_name을 "재무회계"로 수정
UPDATE wrong_notes 
SET subject_name = '재무회계'
WHERE subject_name = '잼회' AND book_name = '최재형 연습서';

-- chapter_name을 통일 (모두 "재고자산 Ch3"으로)
UPDATE wrong_notes 
SET chapter_name = '재고자산 Ch3'
WHERE book_name = '최재형 연습서' 
AND subject_name = '재무회계'
AND (chapter_name LIKE '%재고자산%' OR chapter_name = '3단원 재고자산');