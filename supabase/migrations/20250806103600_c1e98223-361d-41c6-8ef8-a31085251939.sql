-- Create enum for study session types
CREATE TYPE study_session_type AS ENUM ('flashcard', 'quiz', 'review');

-- Create study_sessions table to track user study activities
CREATE TABLE public.study_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    wrong_note_id UUID REFERENCES public.wrong_notes(id) ON DELETE CASCADE NOT NULL,
    session_type study_session_type NOT NULL,
    score INTEGER, -- For quiz sessions (0-100)
    confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5), -- 1-5 scale
    time_spent INTEGER NOT NULL DEFAULT 0, -- seconds
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create review_schedule table for Ebbinghaus forgetting curve
CREATE TABLE public.review_schedule (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    wrong_note_id UUID REFERENCES public.wrong_notes(id) ON DELETE CASCADE NOT NULL,
    review_count INTEGER NOT NULL DEFAULT 0,
    next_review_date TIMESTAMP WITH TIME ZONE NOT NULL,
    interval_days INTEGER NOT NULL DEFAULT 1,
    ease_factor DECIMAL(3,2) NOT NULL DEFAULT 2.50, -- Supermemo algorithm ease factor
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create memorization_checklist table
CREATE TABLE public.memorization_checklist (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    wrong_note_id UUID REFERENCES public.wrong_notes(id) ON DELETE CASCADE NOT NULL,
    is_memorized BOOLEAN NOT NULL DEFAULT false,
    confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5),
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, wrong_note_id)
);

-- Enable RLS on all tables
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorization_checklist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for study_sessions
CREATE POLICY "Users can view their own study sessions" 
ON public.study_sessions FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own study sessions" 
ON public.study_sessions FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own study sessions" 
ON public.study_sessions FOR UPDATE 
USING (user_id = auth.uid());

-- Create RLS policies for review_schedule
CREATE POLICY "Users can view their own review schedule" 
ON public.review_schedule FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own review schedule" 
ON public.review_schedule FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own review schedule" 
ON public.review_schedule FOR UPDATE 
USING (user_id = auth.uid());

-- Create RLS policies for memorization_checklist
CREATE POLICY "Users can view their own memorization checklist" 
ON public.memorization_checklist FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own memorization checklist" 
ON public.memorization_checklist FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own memorization checklist" 
ON public.memorization_checklist FOR UPDATE 
USING (user_id = auth.uid());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_review_schedule_updated_at
    BEFORE UPDATE ON public.review_schedule
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memorization_checklist_updated_at
    BEFORE UPDATE ON public.memorization_checklist
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate next review date based on Ebbinghaus curve
CREATE OR REPLACE FUNCTION public.calculate_next_review_date(
    current_interval INTEGER,
    ease_factor DECIMAL,
    performance_score INTEGER DEFAULT 3
)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;