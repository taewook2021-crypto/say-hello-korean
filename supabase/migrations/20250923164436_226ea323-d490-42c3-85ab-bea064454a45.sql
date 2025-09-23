-- 구독 가격 업데이트 및 Google Vision 사용량 추적 테이블 생성

-- 1. 구독 등급별 가격 업데이트
UPDATE subscription_limits 
SET price_monthly = 4900.00 
WHERE tier_name = 'basic';

-- 2. Google Vision 사용량 추적 테이블 생성
CREATE TABLE IF NOT EXISTS public.google_vision_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

-- 3. RLS 활성화
ALTER TABLE public.google_vision_usage ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 생성
CREATE POLICY "Users can manage their own vision usage" 
ON public.google_vision_usage 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. 업데이트 트리거 추가
CREATE TRIGGER update_google_vision_usage_updated_at
BEFORE UPDATE ON public.google_vision_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();