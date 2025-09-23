-- 🚨 CRITICAL SECURITY FIX: Enable RLS on tables with policies but RLS disabled
-- This fixes the "Policy Exists RLS Disabled" security vulnerability

-- Enable RLS on books table (has policy but RLS was disabled)
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Enable RLS on subjects table (has policy but RLS was disabled)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Verify the fix by checking if RLS is now enabled
-- (This comment is just for documentation - the above commands fix the issue)