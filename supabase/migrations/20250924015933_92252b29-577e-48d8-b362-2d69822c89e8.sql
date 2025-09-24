-- Fix security vulnerability in subscribers table
-- Issue: user_id is nullable, which can create security gaps in RLS policies

-- First, check if there are any rows with NULL user_id and handle them
-- Delete any orphaned rows without user_id (these should not exist in a secure system)
DELETE FROM public.subscribers WHERE user_id IS NULL;

-- Make user_id NOT NULL to prevent future security issues
ALTER TABLE public.subscribers 
ALTER COLUMN user_id SET NOT NULL;

-- Drop existing RLS policies to recreate them more securely
DROP POLICY IF EXISTS "Users can delete their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscribers;

-- Create more secure RLS policies that explicitly check authentication
CREATE POLICY "authenticated_users_can_view_own_subscription" 
ON public.subscribers 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_insert_own_subscription" 
ON public.subscribers 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_own_subscription" 
ON public.subscribers 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_delete_own_subscription" 
ON public.subscribers 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Add a unique constraint to prevent duplicate subscriptions per user
ALTER TABLE public.subscribers 
ADD CONSTRAINT unique_user_subscription 
UNIQUE (user_id);

-- Create an index for better performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id 
ON public.subscribers (user_id);