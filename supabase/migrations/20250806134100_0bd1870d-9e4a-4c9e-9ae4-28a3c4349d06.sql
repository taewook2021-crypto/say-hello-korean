-- 1. "재고자산" 대단원 삭제
DELETE FROM chapters WHERE major_chapter_id = 'c2e20a1e-da50-46ae-aaf8-32f7e0b32aff';
DELETE FROM major_chapters WHERE id = 'c2e20a1e-da50-46ae-aaf8-32f7e0b32aff';

-- 2. 임시 대단원 생성 (UI에서 보이지 않도록)
INSERT INTO major_chapters (id, name, subject_name, book_name) 
VALUES ('00000000-0000-0000-0000-000000000001', '기본단원', '재무회계', '최재형 연습서');

-- 3. "재고자산 Ch3"을 소단원으로 생성
INSERT INTO chapters (name, subject_name, book_name, major_chapter_id)
VALUES ('재고자산 Ch3', '재무회계', '최재형 연습서', '00000000-0000-0000-0000-000000000001');