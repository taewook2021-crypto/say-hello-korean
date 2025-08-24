-- Create items table for archives and folders
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('archive', 'folder')),
  title TEXT, -- for archives
  name TEXT, -- for folders
  source_type TEXT CHECK (source_type IN ('text', 'pdf', 'link') OR source_type IS NULL),
  raw_content TEXT,
  file_url TEXT,
  link_url TEXT,
  description TEXT,
  parent_id UUID REFERENCES public.items(id),
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Allow all operations on items for development" 
ON public.items 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_items_updated_at
BEFORE UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_items_project_id ON public.items(project_id);
CREATE INDEX idx_items_parent_id ON public.items(parent_id);
CREATE INDEX idx_items_type ON public.items(item_type);