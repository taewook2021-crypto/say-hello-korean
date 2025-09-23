-- Create backup table for wrong_notes with versioning
CREATE TABLE public.wrong_notes_backup (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    original_note_id UUID NOT NULL,
    user_id UUID NOT NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
    backup_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Original wrong_note data
    question TEXT NOT NULL,
    source_text TEXT NOT NULL,
    explanation TEXT,
    subject_name TEXT NOT NULL,
    book_name TEXT NOT NULL,
    chapter_name TEXT NOT NULL,
    round_number INTEGER DEFAULT 1,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS
ALTER TABLE public.wrong_notes_backup ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view their own wrong_notes_backup"
ON public.wrong_notes_backup
FOR SELECT
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_wrong_notes_backup_user_id ON public.wrong_notes_backup(user_id);
CREATE INDEX idx_wrong_notes_backup_original_note_id ON public.wrong_notes_backup(original_note_id);
CREATE INDEX idx_wrong_notes_backup_timestamp ON public.wrong_notes_backup(backup_timestamp);

-- Create trigger function for automatic backup
CREATE OR REPLACE FUNCTION public.backup_wrong_note()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic backup on all operations
CREATE TRIGGER trigger_backup_wrong_notes
    AFTER INSERT OR UPDATE OR DELETE ON public.wrong_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.backup_wrong_note();

-- Create additional daily backup table for extra safety
CREATE TABLE public.wrong_notes_daily_backup (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_date DATE NOT NULL DEFAULT CURRENT_DATE,
    user_id UUID NOT NULL,
    backup_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS for daily backup
ALTER TABLE public.wrong_notes_daily_backup ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for daily backup
CREATE POLICY "Users can view their own daily backups"
ON public.wrong_notes_daily_backup
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for daily backup
CREATE INDEX idx_wrong_notes_daily_backup_user_date ON public.wrong_notes_daily_backup(user_id, backup_date);