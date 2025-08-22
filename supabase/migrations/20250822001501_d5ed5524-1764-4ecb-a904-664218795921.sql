-- 테스트 데이터 추가 (새로운 UUID 사용)
INSERT INTO conversations (id, subject, raw_text, user_id, lang) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '🔧 디버그 테스트 대화', 'Q. 디버그 테스트 질문은? A. 디버그 테스트 답변입니다.', 'ebcc4eaf-7b16-4a2b-b3ab-4105ba5ff92c', 'ko');

INSERT INTO summaries (conversation_id, title, content, structure_type) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '🔧 디버그 테스트 정리글', '이것은 디버그 테스트용 정리글입니다.', 'plain');

INSERT INTO qa_pairs (conversation_id, q_text, a_text, difficulty, importance) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '🔧 디버그 테스트 질문이 무엇인가요?', '🔧 디버그 테스트 답변입니다.', 'basic', 'medium');

INSERT INTO node_archives (node_id, conversation_id, title, content_summary, archive_type) VALUES 
('b2491566-f220-4e24-95fc-3e41685d3f5d', '550e8400-e29b-41d4-a716-446655440001', '🔧 디버그 테스트 아카이브', '디버그 테스트용 대화', 'conversation');