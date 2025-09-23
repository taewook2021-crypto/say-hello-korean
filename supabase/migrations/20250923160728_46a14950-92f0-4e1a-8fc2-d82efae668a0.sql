-- 🚨 SECURITY FIX: Enable RLS on tables that have policies but RLS disabled

-- 1. Enable RLS on cards table (ERROR 1)
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on conversations table (ERROR 2) 
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 3. Remove overly permissive development policies
DROP POLICY IF EXISTS "Allow all access for cards development" ON public.cards;
DROP POLICY IF EXISTS "Allow all access for development" ON public.cards;
DROP POLICY IF EXISTS "Allow all access for conversations development" ON public.conversations;

-- 4. Create secure policies for cards (if they should be user-specific)
CREATE POLICY "Users can manage their own cards"
ON public.cards
FOR ALL
USING (qa_id IN (
  SELECT id FROM wrong_notes WHERE user_id = auth.uid()
));

-- 5. Create secure policies for conversations (if they should be user-specific)
CREATE POLICY "Users can manage their own conversations"  
ON public.conversations
FOR ALL
USING (node_id IN (
  SELECT id FROM nodes WHERE user_id = auth.uid()
));