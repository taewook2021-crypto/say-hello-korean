-- 🚨 SECURITY FIX: Fix RLS issues without creating duplicate policies

-- 1. Enable RLS on remaining tables that need it
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorization_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Remove dangerous development policies that allow all access
DROP POLICY IF EXISTS "Allow all access for development" ON public.nodes;
DROP POLICY IF EXISTS "Allow anonymous access for iframe testing" ON public.nodes;
DROP POLICY IF EXISTS "Allow all operations on items for development" ON public.items;
DROP POLICY IF EXISTS "Allow all operations on memorization_checklist" ON public.memorization_checklist;
DROP POLICY IF EXISTS "Allow all operations on review_schedule" ON public.review_schedule;
DROP POLICY IF EXISTS "Allow all operations on study_sessions" ON public.study_sessions;