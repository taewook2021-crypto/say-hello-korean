-- 테스트 데이터 추가 (gen_random_uuid() 사용)
WITH new_conversation AS (
  INSERT INTO conversations (subject, raw_text, user_id, lang) VALUES 
  ('🔧 최종 디버그 테스트 대화', 'Q. 최종 디버그 테스트 질문은? A. 최종 디버그 테스트 답변입니다.', 'ebcc4eaf-7b16-4a2b-b3ab-4105ba5ff92c', 'ko')
  RETURNING id
),
summary_insert AS (
  INSERT INTO summaries (conversation_id, title, content, structure_type) 
  SELECT id, '🔧 최종 디버그 테스트 정리글', '이것은 최종 디버그 테스트용 정리글입니다.', 'plain'
  FROM new_conversation
  RETURNING conversation_id
),
qa_insert AS (
  INSERT INTO qa_pairs (conversation_id, q_text, a_text, difficulty, importance) 
  SELECT id, '🔧 최종 디버그 테스트 질문이 무엇인가요?', '🔧 최종 디버그 테스트 답변입니다.', 'basic', 'medium'
  FROM new_conversation
  RETURNING conversation_id
)
INSERT INTO node_archives (node_id, conversation_id, title, content_summary, archive_type) 
SELECT 'b2491566-f220-4e24-95fc-3e41685d3f5d', id, '🔧 최종 디버그 테스트 아카이브', '최종 디버그 테스트용 대화', 'conversation'
FROM new_conversation;