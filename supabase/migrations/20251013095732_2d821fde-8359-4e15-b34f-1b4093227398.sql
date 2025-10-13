-- Create study_rounds table to store actual study progress (⭕, 🔺, ❌)
CREATE TABLE IF NOT EXISTS public.study_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_name text NOT NULL,
  book_name text NOT NULL,
  chapter_name text NOT NULL,
  problem_number integer NOT NULL,
  round_number integer NOT NULL,
  status text CHECK (status IN ('⭕', '🔺', '❌', '')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_study_round UNIQUE(user_id, subject_name, book_name, chapter_name, problem_number, round_number)
);

-- Enable RLS
ALTER TABLE public.study_rounds ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_rounds
CREATE POLICY "authenticated_users_can_manage_own_study_rounds"
ON public.study_rounds
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create backup table for study_rounds
CREATE TABLE IF NOT EXISTS public.study_rounds_backup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_round_id uuid NOT NULL,
  user_id uuid NOT NULL,
  operation_type text NOT NULL,
  subject_name text NOT NULL,
  book_name text NOT NULL,
  chapter_name text NOT NULL,
  problem_number integer NOT NULL,
  round_number integer NOT NULL,
  status text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  backup_timestamp timestamptz DEFAULT now()
);

-- Enable RLS on backup table
ALTER TABLE public.study_rounds_backup ENABLE ROW LEVEL SECURITY;

-- RLS policy for backup table
CREATE POLICY "authenticated_users_can_view_own_study_rounds_backup"
ON public.study_rounds_backup
FOR SELECT
USING (auth.uid() = user_id);

-- Create backup trigger function
CREATE OR REPLACE FUNCTION public.backup_study_round()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO public.study_rounds_backup (
            original_round_id, user_id, operation_type, subject_name, book_name, chapter_name,
            problem_number, round_number, status, created_at, updated_at
        ) VALUES (
            NEW.id, NEW.user_id, TG_OP, NEW.subject_name, NEW.book_name, NEW.chapter_name,
            NEW.problem_number, NEW.round_number, NEW.status, NEW.created_at, NEW.updated_at
        );
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.study_rounds_backup (
            original_round_id, user_id, operation_type, subject_name, book_name, chapter_name,
            problem_number, round_number, status, created_at, updated_at
        ) VALUES (
            OLD.id, OLD.user_id, TG_OP, OLD.subject_name, OLD.book_name, OLD.chapter_name,
            OLD.problem_number, OLD.round_number, OLD.status, OLD.created_at, OLD.updated_at
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Create trigger for backup
CREATE TRIGGER backup_study_round_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.study_rounds
FOR EACH ROW EXECUTE FUNCTION public.backup_study_round();

-- Create trigger for updated_at
CREATE TRIGGER update_study_rounds_updated_at
BEFORE UPDATE ON public.study_rounds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add study_rounds_data column to comprehensive_daily_backup
ALTER TABLE public.comprehensive_daily_backup 
ADD COLUMN IF NOT EXISTS study_rounds_data jsonb DEFAULT '[]'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_study_rounds_user_book ON public.study_rounds(user_id, subject_name, book_name, chapter_name);
CREATE INDEX IF NOT EXISTS idx_study_rounds_lookup ON public.study_rounds(user_id, subject_name, book_name, chapter_name, problem_number, round_number);