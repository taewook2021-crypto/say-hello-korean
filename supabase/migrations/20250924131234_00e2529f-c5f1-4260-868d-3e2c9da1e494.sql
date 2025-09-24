-- 잘못된 데이터 정리: 빈 문자열이나 점(.)만 있는 데이터 삭제
DELETE FROM chapters 
WHERE subject_name = '.' 
   OR book_name = '.' 
   OR name = '.' 
   OR subject_name = '' 
   OR book_name = '' 
   OR name = ''
   OR TRIM(subject_name) = ''
   OR TRIM(book_name) = ''
   OR TRIM(name) = '';

-- 같은 조건으로 books 테이블도 정리
DELETE FROM books 
WHERE subject_name = '.' 
   OR name = '.' 
   OR subject_name = '' 
   OR name = ''
   OR TRIM(subject_name) = ''
   OR TRIM(name) = '';

-- subjects 테이블도 정리
DELETE FROM subjects 
WHERE name = '.' 
   OR name = ''
   OR TRIM(name) = '';