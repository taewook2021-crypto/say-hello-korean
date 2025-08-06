-- 자동 해결 조건을 체크하고 업데이트하는 함수 생성
CREATE OR REPLACE FUNCTION public.check_and_update_resolved_status()
RETURNS TRIGGER AS $$
DECLARE
    recent_sessions_count INTEGER;
    recent_high_confidence_count INTEGER;
    total_review_count INTEGER;
BEGIN
    -- 최근 복습 세션 수 확인 (자신감 5인 것만)
    SELECT COUNT(*) INTO recent_high_confidence_count
    FROM study_sessions 
    WHERE wrong_note_id = NEW.wrong_note_id 
    AND confidence_level = 5
    ORDER BY completed_at DESC
    LIMIT 2;
    
    -- 총 복습 횟수 확인
    SELECT COUNT(*) INTO total_review_count
    FROM study_sessions 
    WHERE wrong_note_id = NEW.wrong_note_id;
    
    -- 자동 해결 조건: 총 2회 이상 복습 AND 최근 2회 모두 자신감 5
    IF total_review_count >= 2 AND recent_high_confidence_count >= 2 AND NEW.confidence_level = 5 THEN
        UPDATE wrong_notes 
        SET is_resolved = true, updated_at = now()
        WHERE id = NEW.wrong_note_id AND is_resolved = false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 학습 세션이 추가될 때마다 해결 상태 체크하는 트리거 생성
CREATE TRIGGER check_resolved_status_after_study
    AFTER INSERT ON study_sessions
    FOR EACH ROW
    EXECUTE FUNCTION check_and_update_resolved_status();