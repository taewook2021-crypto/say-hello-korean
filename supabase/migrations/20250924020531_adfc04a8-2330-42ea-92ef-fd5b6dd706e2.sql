-- Phase 2: RLS Policy Hardening - Fix Anonymous Access Policies
-- Add TO authenticated clauses to prevent anonymous access

-- 1. Fix books table policies
DROP POLICY IF EXISTS "Users can manage their own books" ON public.books;
CREATE POLICY "authenticated_users_can_manage_own_books" 
ON public.books 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Fix cards table policies
DROP POLICY IF EXISTS "Users can manage their own cards" ON public.cards;
CREATE POLICY "authenticated_users_can_manage_own_cards" 
ON public.cards 
FOR ALL 
TO authenticated 
USING (qa_id IN (SELECT wrong_notes.id FROM wrong_notes WHERE wrong_notes.user_id = auth.uid()));

-- 3. Fix chapters table policies
DROP POLICY IF EXISTS "Users can manage their own chapters" ON public.chapters;
CREATE POLICY "authenticated_users_can_manage_own_chapters" 
ON public.chapters 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Fix conversations table policies
DROP POLICY IF EXISTS "Users can manage their own conversations" ON public.conversations;
CREATE POLICY "authenticated_users_can_manage_own_conversations" 
ON public.conversations 
FOR ALL 
TO authenticated 
USING (node_id IN (SELECT nodes.id FROM nodes WHERE nodes.user_id = auth.uid()));

-- 5. Fix google_vision_usage table policies
DROP POLICY IF EXISTS "Users can manage their own vision usage" ON public.google_vision_usage;
CREATE POLICY "authenticated_users_can_manage_own_vision_usage" 
ON public.google_vision_usage 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Fix items table policies
DROP POLICY IF EXISTS "Users can manage their own items" ON public.items;
CREATE POLICY "authenticated_users_can_manage_own_items" 
ON public.items 
FOR ALL 
TO authenticated 
USING (project_id IN (SELECT nodes.id FROM nodes WHERE nodes.user_id = auth.uid()));

-- 7. Fix major_chapters table policies
DROP POLICY IF EXISTS "Users can manage their own major_chapters" ON public.major_chapters;
CREATE POLICY "authenticated_users_can_manage_own_major_chapters" 
ON public.major_chapters 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- 8. Fix memorization_checklist table policies
DROP POLICY IF EXISTS "Users can manage their own memorization_checklist" ON public.memorization_checklist;
CREATE POLICY "authenticated_users_can_manage_own_memorization_checklist" 
ON public.memorization_checklist 
FOR ALL 
TO authenticated 
USING (wrong_note_id IN (SELECT wrong_notes.id FROM wrong_notes WHERE wrong_notes.user_id = auth.uid()));

-- 9. Fix nodes table policies
DROP POLICY IF EXISTS "Users can manage their own nodes" ON public.nodes;
CREATE POLICY "authenticated_users_can_manage_own_nodes" 
ON public.nodes 
FOR ALL 
TO authenticated 
USING (user_id = auth.uid());

-- 10. Fix pdf_attachments table policies
DROP POLICY IF EXISTS "Users can manage their own pdf_attachments" ON public.pdf_attachments;
CREATE POLICY "authenticated_users_can_manage_own_pdf_attachments" 
ON public.pdf_attachments 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- 11. Fix profiles table policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "authenticated_users_can_view_own_profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "authenticated_users_can_insert_own_profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "authenticated_users_can_update_own_profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 12. Fix review_schedule table policies
DROP POLICY IF EXISTS "Users can manage their own review_schedule" ON public.review_schedule;
CREATE POLICY "authenticated_users_can_manage_own_review_schedule" 
ON public.review_schedule 
FOR ALL 
TO authenticated 
USING (wrong_note_id IN (SELECT wrong_notes.id FROM wrong_notes WHERE wrong_notes.user_id = auth.uid()));

-- 13. Fix study_progress table policies
DROP POLICY IF EXISTS "Users can manage their own study_progress" ON public.study_progress;
CREATE POLICY "authenticated_users_can_manage_own_study_progress" 
ON public.study_progress 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- 14. Fix study_sessions table policies
DROP POLICY IF EXISTS "Users can manage their own study_sessions" ON public.study_sessions;
CREATE POLICY "authenticated_users_can_manage_own_study_sessions" 
ON public.study_sessions 
FOR ALL 
TO authenticated 
USING (wrong_note_id IN (SELECT wrong_notes.id FROM wrong_notes WHERE wrong_notes.user_id = auth.uid()));

-- 15. Fix subjects table policies
DROP POLICY IF EXISTS "Users can manage their own subjects" ON public.subjects;
CREATE POLICY "authenticated_users_can_manage_own_subjects" 
ON public.subjects 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 16. Fix todos table policies
DROP POLICY IF EXISTS "Users can create their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can update their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can view their own todos" ON public.todos;

CREATE POLICY "authenticated_users_can_view_own_todos" 
ON public.todos 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_insert_own_todos" 
ON public.todos 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_own_todos" 
ON public.todos 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_delete_own_todos" 
ON public.todos 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 17. Fix usage_tracking table policies
DROP POLICY IF EXISTS "Users can insert their own usage tracking" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can update their own usage tracking" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can view their own usage tracking" ON public.usage_tracking;

CREATE POLICY "authenticated_users_can_view_own_usage_tracking" 
ON public.usage_tracking 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_insert_own_usage_tracking" 
ON public.usage_tracking 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_own_usage_tracking" 
ON public.usage_tracking 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- 18. Fix wrong_notes table policies
DROP POLICY IF EXISTS "Users can manage their own wrong_notes" ON public.wrong_notes;
CREATE POLICY "authenticated_users_can_manage_own_wrong_notes" 
ON public.wrong_notes 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 19. Fix wrong_notes_backup table policies
DROP POLICY IF EXISTS "Users can view their own wrong_notes_backup" ON public.wrong_notes_backup;
CREATE POLICY "authenticated_users_can_view_own_wrong_notes_backup" 
ON public.wrong_notes_backup 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- 20. Fix wrong_notes_daily_backup table policies
DROP POLICY IF EXISTS "Users can view their own daily backups" ON public.wrong_notes_daily_backup;
CREATE POLICY "authenticated_users_can_view_own_daily_backups" 
ON public.wrong_notes_daily_backup 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);