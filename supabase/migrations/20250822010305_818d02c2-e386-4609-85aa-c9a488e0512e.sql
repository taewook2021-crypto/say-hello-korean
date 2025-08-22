-- Add node_id column to conversations table to link conversations with nodes
ALTER TABLE conversations 
ADD COLUMN node_id uuid REFERENCES nodes(id);