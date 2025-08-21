-- Create nodes table for hierarchical structure
CREATE TABLE public.nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.nodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  description TEXT,
  node_type TEXT NOT NULL DEFAULT 'project', -- 'project', 'category', 'topic', etc.
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create node_archives table to store archived conversations/content for each node
CREATE TABLE public.node_archives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id UUID NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_summary TEXT,
  archive_type TEXT NOT NULL DEFAULT 'conversation', -- 'conversation', 'document', 'note', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_archives ENABLE ROW LEVEL SECURITY;

-- Create policies for nodes table
CREATE POLICY "Users can view their own nodes" 
ON public.nodes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nodes" 
ON public.nodes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nodes" 
ON public.nodes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nodes" 
ON public.nodes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for node_archives table
CREATE POLICY "Users can view their own node archives" 
ON public.node_archives 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.nodes 
  WHERE nodes.id = node_archives.node_id 
  AND nodes.user_id = auth.uid()
));

CREATE POLICY "Users can create their own node archives" 
ON public.node_archives 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.nodes 
  WHERE nodes.id = node_archives.node_id 
  AND nodes.user_id = auth.uid()
));

CREATE POLICY "Users can update their own node archives" 
ON public.node_archives 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.nodes 
  WHERE nodes.id = node_archives.node_id 
  AND nodes.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own node archives" 
ON public.node_archives 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.nodes 
  WHERE nodes.id = node_archives.node_id 
  AND nodes.user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_nodes_user_id ON public.nodes(user_id);
CREATE INDEX idx_nodes_parent_id ON public.nodes(parent_id);
CREATE INDEX idx_node_archives_node_id ON public.node_archives(node_id);
CREATE INDEX idx_node_archives_conversation_id ON public.node_archives(conversation_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_nodes_updated_at
BEFORE UPDATE ON public.nodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_node_archives_updated_at
BEFORE UPDATE ON public.node_archives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();