-- 프로젝트 상태 추적을 위한 필드들 추가
ALTER TABLE public.nodes 
ADD COLUMN archive_count INTEGER DEFAULT 0,
ADD COLUMN is_completed BOOLEAN DEFAULT false,
ADD COLUMN milestone_achieved BOOLEAN DEFAULT false,
ADD COLUMN cover_image TEXT,
ADD COLUMN project_status TEXT DEFAULT 'new' CHECK (project_status IN ('new', 'growing', 'mature', 'completed'));

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
CREATE TRIGGER update_archive_count_trigger
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_project_archive_count();