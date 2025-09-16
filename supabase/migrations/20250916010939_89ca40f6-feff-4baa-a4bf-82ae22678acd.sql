-- Create study_progress table for tracking reading repetitions
CREATE TABLE public.study_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  subject_name TEXT NOT NULL,
  book_name TEXT NOT NULL,
  chapter_name TEXT NOT NULL,
  round_number INTEGER NOT NULL DEFAULT 1,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  target_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT -- 회독별 메모
);

-- Enable RLS
ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own study progress" 
ON public.study_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own study progress" 
ON public.study_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study progress" 
ON public.study_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study progress" 
ON public.study_progress 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_study_progress_updated_at
BEFORE UPDATE ON public.study_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add round_number to wrong_notes table to track which round the mistake was made
ALTER TABLE public.wrong_notes 
ADD COLUMN round_number INTEGER DEFAULT 1;