-- Phase 1: Fix Critical Database Function Security Issues
-- Update all database functions to use secure search_path

-- 1. Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- 2. Update update_project_archive_count function  
CREATE OR REPLACE FUNCTION public.update_project_archive_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 3. Update update_usage_tracking function
CREATE OR REPLACE FUNCTION public.update_usage_tracking(p_user_id uuid, p_model_name text, p_input_tokens integer, p_output_tokens integer, p_total_cost numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.usage_tracking (user_id, model_name, input_tokens, output_tokens, total_cost, question_count, date)
  VALUES (p_user_id, p_model_name, p_input_tokens, p_output_tokens, p_total_cost, 1, CURRENT_DATE)
  ON CONFLICT (user_id, model_name, date)
  DO UPDATE SET
    input_tokens = usage_tracking.input_tokens + p_input_tokens,
    output_tokens = usage_tracking.output_tokens + p_output_tokens,
    total_cost = usage_tracking.total_cost + p_total_cost,
    question_count = usage_tracking.question_count + 1;
END;
$function$;

-- 4. Update calculate_next_review_date function
CREATE OR REPLACE FUNCTION public.calculate_next_review_date(current_interval integer, ease_factor numeric, performance_score integer DEFAULT 3)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    new_interval INTEGER;
    new_ease_factor DECIMAL;
BEGIN
    -- Adjust ease factor based on performance (1-5 scale)
    new_ease_factor := ease_factor + (0.1 - (5 - performance_score) * (0.08 + (5 - performance_score) * 0.02));
    
    -- Ensure ease factor doesn't go below 1.3
    IF new_ease_factor < 1.3 THEN
        new_ease_factor := 1.3;
    END IF;
    
    -- Calculate new interval based on Ebbinghaus curve
    CASE
        WHEN current_interval = 1 THEN
            new_interval := 1;
        WHEN current_interval = 2 THEN
            new_interval := 6;
        ELSE
            new_interval := ROUND(current_interval * new_ease_factor);
    END CASE;
    
    RETURN new_interval;
END;
$function$;

-- 5. Update check_and_update_resolved_status function
CREATE OR REPLACE FUNCTION public.check_and_update_resolved_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 6. Update check_usage_limits function
CREATE OR REPLACE FUNCTION public.check_usage_limits(p_user_id uuid, p_subscription_tier text DEFAULT 'free'::text)
RETURNS TABLE(daily_used integer, daily_limit integer, monthly_used integer, monthly_limit integer, can_ask boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_daily_used INTEGER;
  v_monthly_used INTEGER;
  v_limits RECORD;
BEGIN
  -- Get subscription limits
  SELECT daily_question_limit, monthly_question_limit 
  INTO v_limits
  FROM public.subscription_limits 
  WHERE tier_name = p_subscription_tier;
  
  -- Get daily usage
  SELECT COALESCE(SUM(question_count), 0)
  INTO v_daily_used
  FROM public.usage_tracking
  WHERE user_id = p_user_id AND date = CURRENT_DATE;
  
  -- Get monthly usage
  SELECT COALESCE(SUM(question_count), 0)
  INTO v_monthly_used
  FROM public.usage_tracking
  WHERE user_id = p_user_id 
    AND date >= DATE_TRUNC('month', CURRENT_DATE)
    AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
  
  RETURN QUERY SELECT 
    v_daily_used,
    v_limits.daily_question_limit,
    v_monthly_used,
    v_limits.monthly_question_limit,
    (v_daily_used < v_limits.daily_question_limit AND v_monthly_used < v_limits.monthly_question_limit);
END;
$function$;

-- 7. Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.raw_user_meta_data ->> 'avatar_url',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$function$;

-- 8. Update debug_auth_info function
CREATE OR REPLACE FUNCTION public.debug_auth_info()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT json_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'current_user', current_user
  );
$function$;

-- 9. Update backup_wrong_note function
CREATE OR REPLACE FUNCTION public.backup_wrong_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    -- Handle INSERT and UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO public.wrong_notes_backup (
            original_note_id,
            user_id,
            operation_type,
            question,
            source_text,
            explanation,
            subject_name,
            book_name,
            chapter_name,
            round_number,
            is_resolved,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            NEW.user_id,
            TG_OP,
            NEW.question,
            NEW.source_text,
            NEW.explanation,
            NEW.subject_name,
            NEW.book_name,
            NEW.chapter_name,
            NEW.round_number,
            NEW.is_resolved,
            NEW.created_at,
            NEW.updated_at
        );
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.wrong_notes_backup (
            original_note_id,
            user_id,
            operation_type,
            question,
            source_text,
            explanation,
            subject_name,
            book_name,
            chapter_name,
            round_number,
            is_resolved,
            created_at,
            updated_at
        ) VALUES (
            OLD.id,
            OLD.user_id,
            TG_OP,
            OLD.question,
            OLD.source_text,
            OLD.explanation,
            OLD.subject_name,
            OLD.book_name,
            OLD.chapter_name,
            OLD.round_number,
            OLD.is_resolved,
            OLD.created_at,
            OLD.updated_at
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;