-- 🚨 SECURITY FIX: Remove overly permissive policies on subscribers table

-- 1. Drop dangerous development policies
DROP POLICY IF EXISTS "Allow all access for development" ON public.subscribers;
DROP POLICY IF EXISTS "Allow all access for subscribers development" ON public.subscribers;

-- 2. Create secure RLS policies that only allow users to access their own data
CREATE POLICY "Users can view their own subscription"
ON public.subscribers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
ON public.subscribers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.subscribers
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscription"
ON public.subscribers
FOR DELETE
USING (auth.uid() = user_id);

-- 3. Ensure RLS is enabled on the table
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;