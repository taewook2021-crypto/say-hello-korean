-- 1. 원가회계 이승우 최종점검용 기본단원 생성
INSERT INTO major_chapters (id, subject_name, book_name, name)
VALUES ('33333333-3333-3333-3333-333333333333', '원가회계', '이승우 최종점검', '기본단원');

-- 2. 잘못 연결된 "Ch 1 정상원가계산"을 올바른 원가회계 기본단원으로 이동
UPDATE chapters 
SET major_chapter_id = '33333333-3333-3333-3333-333333333333',
    subject_name = '원가회계',
    book_name = '이승우 최종점검'
WHERE name = 'Ch 1 정상원가계산' 
AND subject_name = '회계감사' 
AND book_name = '하루에 끝장내기';