-- 모든 외래키 제약조건 제거하고 단순한 conversations 테이블로 재시작

-- 1. 모든 외래키 제약조건 제거
DROP TABLE IF EXISTS qa_pairs CASCADE;
DROP TABLE IF EXISTS summaries CASCADE; 
DROP TABLE IF EXISTS node_archives CASCADE;

-- 2. conversations 테이블을 단순화
DROP TABLE IF EXISTS conversations CASCADE;

-- 3. 최소 스키마로 conversations 테이블 재생성
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. RLS 정책 설정 (개발용 - 모든 접근 허용)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for conversations development" 
ON conversations 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 5. 테스트 데이터 삽입
INSERT INTO conversations (title, content) VALUES 
('테스트 대화 1', '이것은 첫 번째 테스트 대화 내용입니다.'),
('테스트 대화 2', '이것은 두 번째 테스트 대화 내용입니다.');