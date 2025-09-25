-- Create comprehensive backup tables for all critical data
CREATE TABLE IF NOT EXISTS public.subjects_backup (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    original_subject_id UUID NOT NULL,
    user_id UUID NOT NULL,
    operation_type TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    subject_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    backup_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.books_backup (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    original_book_id UUID NOT NULL,
    user_id UUID NOT NULL,
    operation_type TEXT NOT NULL,
    book_name TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    backup_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chapters_backup (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    original_chapter_id UUID NOT NULL,
    user_id UUID NOT NULL,
    operation_type TEXT NOT NULL,
    chapter_name TEXT NOT NULL,
    book_name TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    major_chapter_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    backup_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_progress_backup (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    original_progress_id UUID NOT NULL,
    user_id UUID NOT NULL,
    operation_type TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    book_name TEXT NOT NULL,
    chapter_name TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    is_completed BOOLEAN NOT NULL,
    status TEXT,
    notes TEXT,
    target_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    backup_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on backup tables
ALTER TABLE public.subjects_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_progress_backup ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for backup tables
CREATE POLICY "authenticated_users_can_view_own_subjects_backup" 
ON public.subjects_backup FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_view_own_books_backup" 
ON public.books_backup FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_view_own_chapters_backup" 
ON public.chapters_backup FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_view_own_study_progress_backup" 
ON public.study_progress_backup FOR SELECT 
USING (auth.uid() = user_id);

-- Create comprehensive backup functions
CREATE OR REPLACE FUNCTION public.backup_subject()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO public.subjects_backup (
            original_subject_id, user_id, operation_type, subject_name, created_at
        ) VALUES (
            NEW.id, NEW.user_id, TG_OP, NEW.name, NEW.created_at
        );
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.subjects_backup (
            original_subject_id, user_id, operation_type, subject_name, created_at
        ) VALUES (
            OLD.id, OLD.user_id, TG_OP, OLD.name, OLD.created_at
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.backup_book()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO public.books_backup (
            original_book_id, user_id, operation_type, book_name, subject_name, created_at
        ) VALUES (
            NEW.id, NEW.user_id, TG_OP, NEW.name, NEW.subject_name, NEW.created_at
        );
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.books_backup (
            original_book_id, user_id, operation_type, book_name, subject_name, created_at
        ) VALUES (
            OLD.id, OLD.user_id, TG_OP, OLD.name, OLD.subject_name, OLD.created_at
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.backup_chapter()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO public.chapters_backup (
            original_chapter_id, user_id, operation_type, chapter_name, book_name, subject_name, major_chapter_id, created_at
        ) VALUES (
            NEW.id, NEW.user_id, TG_OP, NEW.name, NEW.book_name, NEW.subject_name, NEW.major_chapter_id, NEW.created_at
        );
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.chapters_backup (
            original_chapter_id, user_id, operation_type, chapter_name, book_name, subject_name, major_chapter_id, created_at
        ) VALUES (
            OLD.id, OLD.user_id, TG_OP, OLD.name, OLD.book_name, OLD.subject_name, OLD.major_chapter_id, OLD.created_at
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.backup_study_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO public.study_progress_backup (
            original_progress_id, user_id, operation_type, subject_name, book_name, chapter_name,
            round_number, is_completed, status, notes, target_date, completed_at, created_at, updated_at
        ) VALUES (
            NEW.id, NEW.user_id, TG_OP, NEW.subject_name, NEW.book_name, NEW.chapter_name,
            NEW.round_number, NEW.is_completed, NEW.status, NEW.notes, NEW.target_date, NEW.completed_at, NEW.created_at, NEW.updated_at
        );
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.study_progress_backup (
            original_progress_id, user_id, operation_type, subject_name, book_name, chapter_name,
            round_number, is_completed, status, notes, target_date, completed_at, created_at, updated_at
        ) VALUES (
            OLD.id, OLD.user_id, TG_OP, OLD.subject_name, OLD.book_name, OLD.chapter_name,
            OLD.round_number, OLD.is_completed, OLD.status, OLD.notes, OLD.target_date, OLD.completed_at, OLD.created_at, OLD.updated_at
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for automatic backup
CREATE TRIGGER backup_subjects_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.subjects
    FOR EACH ROW EXECUTE FUNCTION public.backup_subject();

CREATE TRIGGER backup_books_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.books
    FOR EACH ROW EXECUTE FUNCTION public.backup_book();

CREATE TRIGGER backup_chapters_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.chapters
    FOR EACH ROW EXECUTE FUNCTION public.backup_chapter();

CREATE TRIGGER backup_study_progress_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.study_progress
    FOR EACH ROW EXECUTE FUNCTION public.backup_study_progress();

-- Create comprehensive daily backup table
CREATE TABLE IF NOT EXISTS public.comprehensive_daily_backup (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    backup_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subjects_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    books_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    chapters_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    wrong_notes_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    study_progress_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    backup_size_kb INTEGER DEFAULT 0,
    backup_status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, backup_date)
);

-- Enable RLS on comprehensive daily backup
ALTER TABLE public.comprehensive_daily_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_can_view_own_comprehensive_daily_backups" 
ON public.comprehensive_daily_backup FOR SELECT 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subjects_backup_user_id ON public.subjects_backup(user_id);
CREATE INDEX IF NOT EXISTS idx_books_backup_user_id ON public.books_backup(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_backup_user_id ON public.chapters_backup(user_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_backup_user_id ON public.study_progress_backup(user_id);
CREATE INDEX IF NOT EXISTS idx_comprehensive_daily_backup_user_date ON public.comprehensive_daily_backup(user_id, backup_date);

-- Create data recovery functions
CREATE OR REPLACE FUNCTION public.get_user_backup_summary(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(
    backup_date DATE,
    subjects_count INTEGER,
    books_count INTEGER,
    chapters_count INTEGER,
    wrong_notes_count INTEGER,
    study_progress_count INTEGER,
    backup_size_kb INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cdb.backup_date,
        COALESCE(jsonb_array_length(cdb.subjects_data), 0)::INTEGER as subjects_count,
        COALESCE(jsonb_array_length(cdb.books_data), 0)::INTEGER as books_count,
        COALESCE(jsonb_array_length(cdb.chapters_data), 0)::INTEGER as chapters_count,
        COALESCE(jsonb_array_length(cdb.wrong_notes_data), 0)::INTEGER as wrong_notes_count,
        COALESCE(jsonb_array_length(cdb.study_progress_data), 0)::INTEGER as study_progress_count,
        cdb.backup_size_kb
    FROM public.comprehensive_daily_backup cdb
    WHERE cdb.user_id = p_user_id
    ORDER BY cdb.backup_date DESC
    LIMIT 30;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;