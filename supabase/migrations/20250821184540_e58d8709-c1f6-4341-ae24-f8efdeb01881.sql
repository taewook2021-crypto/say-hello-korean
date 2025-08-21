-- ARO 학습 앱을 위한 데이터베이스 구조 생성

-- 1. conversations 테이블: AI 대화 원본 저장
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'ko',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. qa_pairs 테이블: 파싱된 Q&A 저장
CREATE TABLE public.qa_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  q_text TEXT NOT NULL,
  a_text TEXT NOT NULL,
  importance TEXT DEFAULT 'medium',
  difficulty TEXT DEFAULT 'basic',
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. cards 테이블: 플래시카드 복습 시스템
CREATE TABLE public.cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qa_id UUID NOT NULL REFERENCES public.qa_pairs(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  next_review_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ease_factor NUMERIC NOT NULL DEFAULT 2.50,
  interval_days INTEGER NOT NULL DEFAULT 1,
  reviewed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 정책 설정
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- conversations 테이블 RLS 정책
CREATE POLICY "Users can view their own conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
ON public.conversations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
ON public.conversations 
FOR DELETE 
USING (auth.uid() = user_id);

-- qa_pairs 테이블 RLS 정책 (conversation을 통한 간접 접근)
CREATE POLICY "Users can view their own qa_pairs" 
ON public.qa_pairs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = qa_pairs.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own qa_pairs" 
ON public.qa_pairs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = qa_pairs.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own qa_pairs" 
ON public.qa_pairs 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = qa_pairs.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own qa_pairs" 
ON public.qa_pairs 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = qa_pairs.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

-- cards 테이블 RLS 정책 (qa_pairs를 통한 간접 접근)
CREATE POLICY "Users can view their own cards" 
ON public.cards 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.qa_pairs 
    JOIN public.conversations ON qa_pairs.conversation_id = conversations.id
    WHERE qa_pairs.id = cards.qa_id 
    AND conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own cards" 
ON public.cards 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.qa_pairs 
    JOIN public.conversations ON qa_pairs.conversation_id = conversations.id
    WHERE qa_pairs.id = cards.qa_id 
    AND conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own cards" 
ON public.cards 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.qa_pairs 
    JOIN public.conversations ON qa_pairs.conversation_id = conversations.id
    WHERE qa_pairs.id = cards.qa_id 
    AND conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own cards" 
ON public.cards 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.qa_pairs 
    JOIN public.conversations ON qa_pairs.conversation_id = conversations.id
    WHERE qa_pairs.id = cards.qa_id 
    AND conversations.user_id = auth.uid()
  )
);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_subject ON public.conversations(subject);
CREATE INDEX idx_qa_pairs_conversation_id ON public.qa_pairs(conversation_id);
CREATE INDEX idx_cards_qa_id ON public.cards(qa_id);
CREATE INDEX idx_cards_next_review_date ON public.cards(next_review_date);

-- 타임스탬프 자동 업데이트 트리거
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qa_pairs_updated_at
BEFORE UPDATE ON public.qa_pairs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cards_updated_at
BEFORE UPDATE ON public.cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();