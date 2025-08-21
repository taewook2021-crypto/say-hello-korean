-- Create summaries table for structured content
CREATE TABLE public.summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown formatted content
  structure_type TEXT NOT NULL DEFAULT 'markdown', -- markdown, outline, etc
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- Create policies for summaries
CREATE POLICY "Users can view their own summaries" 
ON public.summaries 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM conversations 
  WHERE conversations.id = summaries.conversation_id 
  AND conversations.user_id = auth.uid()
));

CREATE POLICY "Users can create their own summaries" 
ON public.summaries 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM conversations 
  WHERE conversations.id = summaries.conversation_id 
  AND conversations.user_id = auth.uid()
));

CREATE POLICY "Users can update their own summaries" 
ON public.summaries 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM conversations 
  WHERE conversations.id = summaries.conversation_id 
  AND conversations.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own summaries" 
ON public.summaries 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM conversations 
  WHERE conversations.id = summaries.conversation_id 
  AND conversations.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_summaries_updated_at
BEFORE UPDATE ON public.summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();