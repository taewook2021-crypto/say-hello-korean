-- 1단계: 재고자산 Ch3을 대단원에서 삭제
DELETE FROM major_chapters WHERE id = 'd78086c2-abf9-4bcb-8055-9247a441719b';

-- 2단계: "재고자산"이라는 대단원이 있는지 확인하고 없으면 생성
INSERT INTO major_chapters (name, subject_name, book_name) 
SELECT '재고자산', '재무회계', '최재형 연습서'
WHERE NOT EXISTS (
    SELECT 1 FROM major_chapters 
    WHERE name = '재고자산' 
    AND subject_name = '재무회계' 
    AND book_name = '최재형 연습서'
);

-- 3단계: 새로 생성된 "재고자산" 대단원의 ID를 찾아서 "Ch3"을 소단원으로 생성
WITH new_major AS (
    SELECT id FROM major_chapters 
    WHERE name = '재고자산' 
    AND subject_name = '재무회계' 
    AND book_name = '최재형 연습서'
)
INSERT INTO chapters (name, subject_name, book_name, major_chapter_id)
SELECT 'Ch3', '재무회계', '최재형 연습서', new_major.id
FROM new_major;