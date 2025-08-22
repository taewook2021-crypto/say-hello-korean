-- 중복된 외래 키 제약조건들 제거하고 하나씩만 남기기

-- 먼저 기존 제약조건들 확인하고 제거
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- qa_pairs 테이블의 모든 외래 키 제약조건 제거
    FOR r IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'qa_pairs' 
        AND constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
    LOOP
        EXECUTE 'ALTER TABLE qa_pairs DROP CONSTRAINT IF EXISTS ' || r.constraint_name || ' CASCADE';
    END LOOP;
    
    -- summaries 테이블의 모든 외래 키 제약조건 제거
    FOR r IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'summaries' 
        AND constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
    LOOP
        EXECUTE 'ALTER TABLE summaries DROP CONSTRAINT IF EXISTS ' || r.constraint_name || ' CASCADE';
    END LOOP;
    
    -- node_archives 테이블의 conversation_id 외래 키 제약조건 제거
    FOR r IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'node_archives' 
        AND constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
        AND constraint_name LIKE '%conversation%'
    LOOP
        EXECUTE 'ALTER TABLE node_archives DROP CONSTRAINT IF EXISTS ' || r.constraint_name || ' CASCADE';
    END LOOP;
END $$;

-- 깨끗하게 단일 외래 키 제약조건들 추가
ALTER TABLE summaries 
ADD CONSTRAINT summaries_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE qa_pairs 
ADD CONSTRAINT qa_pairs_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE node_archives 
ADD CONSTRAINT node_archives_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;