-- Phase 2: Fix Anonymous Access Policies for Core User Data Tables
-- Add TO authenticated clauses to prevent anonymous access

-- Fix books table policies
DROP POLICY IF EXISTS "Users can manage their own books" ON public.books;
CREATE POLICY "Users can manage their own books" 
ON public.books 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix cards table policies
DROP POLICY IF EXISTS "Users can manage their own cards" ON public.cards;
CREATE POLICY "Users can manage their own cards" 
ON public.cards 
FOR ALL 
TO authenticated 
USING (qa_id IN ( SELECT wrong_notes.id FROM wrong_notes WHERE (wrong_notes.user_id = auth.uid())));

-- Fix chapters table policies
DROP POLICY IF EXISTS "Users can manage their own chapters" ON public.chapters;
CREATE POLICY "Users can manage their own chapters" 
ON public.chapters 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix conversations table policies
DROP POLICY IF EXISTS "Users can manage their own conversations" ON public.conversations;
CREATE POLICY "Users can manage their own conversations" 
ON public.conversations 
FOR ALL 
TO authenticated 
USING (node_id IN ( SELECT nodes.id FROM nodes WHERE (nodes.user_id = auth.uid())));

-- Fix google_vision_usage table policies
DROP POLICY IF EXISTS "Users can manage their own vision usage" ON public.google_vision_usage;
CREATE POLICY "Users can manage their own vision usage" 
ON public.google_vision_usage 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix items table policies
DROP POLICY IF EXISTS "Users can manage their own items" ON public.items;
CREATE POLICY "Users can manage their own items" 
ON public.items 
FOR ALL 
TO authenticated 
USING (project_id IN ( SELECT nodes.id FROM nodes WHERE (nodes.user_id = auth.uid())));

-- Fix major_chapters table policies
DROP POLICY IF EXISTS "Users can manage their own major_chapters" ON public.major_chapters;
CREATE POLICY "Users can manage their own major_chapters" 
ON public.major_chapters 
FOR ALL 
TO authenticated 
USING ((auth.uid() = user_id) OR (user_id IS NULL))
WITH CHECK (auth.uid() = user_id);

-- Fix memorization_checklist table policies
DROP POLICY IF EXISTS "Users can manage their own memorization_checklist" ON public.memorization_checklist;
CREATE POLICY "Users can manage their own memorization_checklist" 
ON public.memorization_checklist 
FOR ALL 
TO authenticated 
USING (wrong_note_id IN ( SELECT wrong_notes.id FROM wrong_notes WHERE (wrong_notes.user_id = auth.uid())));

-- Fix nodes table policies
DROP POLICY IF EXISTS "Users can manage their own nodes" ON public.nodes;
CREATE POLICY "Users can manage their own nodes" 
ON public.nodes 
FOR ALL 
TO authenticated 
USING (user_id = auth.uid());

-- Fix pdf_attachments table policies
DROP POLICY IF EXISTS "Users can manage their own pdf_attachments" ON public.pdf_attachments;
CREATE POLICY "Users can manage their own pdf_attachments" 
ON public.pdf_attachments 
FOR ALL 
TO authenticated 
USING ((auth.uid() = user_id) OR (user_id IS NULL))
WITH CHECK (auth.uid() = user_id);