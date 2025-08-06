-- 1. 원가회계와 재무회계에 하루에 끝장내기 책 생성
INSERT INTO books (subject_name, name)
VALUES ('원가회계', '하루에 끝장내기');

INSERT INTO books (subject_name, name)
VALUES ('재무회계', '하루에 끝장내기');

-- 2. 원가회계 하루에 끝장내기 책용 기본단원 생성
INSERT INTO major_chapters (id, subject_name, book_name, name)
VALUES ('11111111-1111-1111-1111-111111111111', '원가회계', '하루에 끝장내기', '기본단원');

-- 3. 재무회계 하루에 끝장내기 책용 기본단원 생성
INSERT INTO major_chapters (id, subject_name, book_name, name)
VALUES ('22222222-2222-2222-2222-222222222222', '재무회계', '하루에 끝장내기', '기본단원');

-- 4. 원가회계 소단원을 올바른 기본단원에 연결
UPDATE chapters 
SET major_chapter_id = '11111111-1111-1111-1111-111111111111'
WHERE subject_name = '원가회계' 
AND book_name = '하루에 끝장내기' 
AND name = 'Ch 1 정상원가계산';

-- 5. 재무회계 소단원을 올바른 기본단원에 연결
UPDATE chapters 
SET major_chapter_id = '22222222-2222-2222-2222-222222222222'
WHERE subject_name = '재무회계' 
AND book_name = '하루에 끝장내기' 
AND name = '재고자산';