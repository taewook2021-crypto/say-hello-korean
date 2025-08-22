-- 올바른 외래 키 관계 추가 (이전 마이그레이션 수정)

-- summaries 테이블에 외래 키 제약조건 추가
ALTER TABLE summaries 
ADD CONSTRAINT fk_summaries_conversation_id 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- qa_pairs 테이블에 외래 키 제약조건 추가 (올바른 참조)
ALTER TABLE qa_pairs 
ADD CONSTRAINT fk_qa_pairs_conversation_id 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- node_archives 테이블에도 외래 키 제약조건 추가 (conversations와의 관계)
ALTER TABLE node_archives 
ADD CONSTRAINT fk_node_archives_conversation_id 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;