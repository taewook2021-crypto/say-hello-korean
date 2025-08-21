-- Remove node_type column from nodes table as it's no longer needed
ALTER TABLE public.nodes DROP COLUMN IF EXISTS node_type;