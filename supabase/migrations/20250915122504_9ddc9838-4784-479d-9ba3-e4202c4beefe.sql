-- 오답노트 테이블 구조 변경: "내가 적은 답" 제거, "정답"을 "근거 원문"으로 변경
-- 1. wrong_answer 컬럼 제거
ALTER TABLE wrong_notes DROP COLUMN IF EXISTS wrong_answer;

-- 2. correct_answer 컬럼명을 source_text로 변경 (근거 원문)
ALTER TABLE wrong_notes RENAME COLUMN correct_answer TO source_text;

-- 3. 컬럼에 주석 추가하여 의미 명확화
COMMENT ON COLUMN wrong_notes.source_text IS '관련 기준서/법령 원문';
COMMENT ON COLUMN wrong_notes.explanation IS '원문에 대한 해설 및 풀이';