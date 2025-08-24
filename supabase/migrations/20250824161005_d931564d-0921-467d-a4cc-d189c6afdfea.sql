-- 프로젝트 상태 추적을 위한 필드들 추가 (archive_count는 이미 존재)
ALTER TABLE public.nodes 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS milestone_achieved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cover_image TEXT,
ADD COLUMN IF NOT EXISTS project_status TEXT DEFAULT 'new';

-- project_status 제약 조건 추가
ALTER TABLE public.nodes 
ADD CONSTRAINT project_status_check 
CHECK (project_status IN ('new', 'growing', 'mature', 'completed'));

-- 아카이브 카운트 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION update_project_archive_count()
RETURNS TRIGGER AS $$
BEGIN
    -- conversations 테이블에 새 아카이브가 추가될 때마다 parent 노드의 archive_count 증가
    IF TG_OP = 'INSERT' THEN
        UPDATE nodes 
        SET 
            archive_count = archive_count + 1,
            project_status = CASE 
                WHEN archive_count = 0 THEN 'growing'
                WHEN archive_count >= 5 THEN 'mature'
                ELSE project_status
            END
        WHERE id = NEW.node_id;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- conversations 테이블에 트리거 추가
DROP TRIGGER IF EXISTS update_archive_count_trigger ON conversations;
CREATE TRIGGER update_archive_count_trigger
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_project_archive_count();