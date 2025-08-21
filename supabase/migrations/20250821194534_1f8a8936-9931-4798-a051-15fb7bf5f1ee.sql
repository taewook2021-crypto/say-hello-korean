-- Enable realtime for nodes table
ALTER TABLE public.nodes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nodes;

-- Enable realtime for node_archives table  
ALTER TABLE public.node_archives REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.node_archives;