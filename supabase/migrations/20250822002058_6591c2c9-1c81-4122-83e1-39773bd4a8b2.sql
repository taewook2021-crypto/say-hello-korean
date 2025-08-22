-- conversations와 summaries, qa_pairs 간의 외래 키 관계 추가
-- 이렇게 해야 PostgREST가 JOIN 연산을 수행할 수 있습니다

-- summaries 테이블에 외래 키 제약조건 추가
ALTER TABLE summaries 
ADD CONSTRAINT fk_summaries_conversation_id 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- qa_pairs 테이블에 외래 키 제약조건 추가
ALTER TABLE qa_pairs 
ADD CONSTRAINT fk_qa_pairs_conversation_id 
FOREIGN KEY (conversation_id) REFERENCES qa_pairs(id) ON DELETE CASCADE;

-- node_archives 테이블에도 외래 키 제약조건 추가 (conversations와의 관계)
ALTER TABLE node_archives 
ADD CONSTRAINT fk_node_archives_conversation_id 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;