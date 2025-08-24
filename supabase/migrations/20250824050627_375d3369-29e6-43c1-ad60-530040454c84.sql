-- Add deadline field to nodes table
ALTER TABLE public.nodes 
ADD COLUMN deadline timestamp with time zone;