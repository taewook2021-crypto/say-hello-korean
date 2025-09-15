-- Create model pricing table
CREATE TABLE public.model_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL UNIQUE,
  input_price_per_1k_tokens DECIMAL(10, 6) NOT NULL,
  output_price_per_1k_tokens DECIMAL(10, 6) NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert model pricing data
INSERT INTO public.model_pricing (model_name, input_price_per_1k_tokens, output_price_per_1k_tokens, description, features) VALUES 
('gpt-5-2025-08-07', 0.050000, 0.150000, '최신 GPT-5 플래그십 모델', ARRAY['최고 성능', '복잡한 추론', '멀티모달']),
('gpt-5-mini-2025-08-07', 0.020000, 0.080000, '빠르고 효율적인 GPT-5 버전', ARRAY['빠른 응답', '비용 효율적', '일반 작업']),
('gpt-5-nano-2025-08-07', 0.010000, 0.040000, '가장 빠르고 저렴한 GPT-5', ARRAY['초고속', '초저비용', '분류/요약']),
('gpt-4.1-2025-04-14', 0.030000, 0.060000, 'GPT-4.1 플래그십 모델', ARRAY['안정적', '신뢰성', '범용']),
('gpt-4o-mini', 0.000150, 0.000600, '기존 GPT-4o 미니 모델', ARRAY['저비용', '빠름', '기본 작업']);

-- Create subscription limits table
CREATE TABLE public.subscription_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_name TEXT NOT NULL UNIQUE,
  daily_question_limit INTEGER NOT NULL,
  monthly_question_limit INTEGER NOT NULL,
  allowed_models TEXT[],
  price_monthly DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert subscription tiers
INSERT INTO public.subscription_limits (tier_name, daily_question_limit, monthly_question_limit, allowed_models, price_monthly) VALUES 
('free', 10, 100, ARRAY['gpt-4o-mini'], 0.00),
('basic', 50, 1000, ARRAY['gpt-4o-mini', 'gpt-5-nano-2025-08-07', 'gpt-5-mini-2025-08-07'], 9.99),
('premium', 200, 5000, ARRAY['gpt-4o-mini', 'gpt-5-nano-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-4.1-2025-04-14', 'gpt-5-2025-08-07'], 29.99);

-- Create usage tracking table
CREATE TABLE public.usage_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  question_count INTEGER NOT NULL DEFAULT 1,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, model_name, date)
);

-- Enable RLS on all tables
ALTER TABLE public.model_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for model_pricing (public read)
CREATE POLICY "Allow public read access to model_pricing" ON public.model_pricing FOR SELECT USING (true);

-- Create policies for subscription_limits (public read)
CREATE POLICY "Allow public read access to subscription_limits" ON public.subscription_limits FOR SELECT USING (true);

-- Create policies for usage_tracking (user-specific)
CREATE POLICY "Users can view their own usage tracking" ON public.usage_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own usage tracking" ON public.usage_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own usage tracking" ON public.usage_tracking FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update usage tracking
CREATE OR REPLACE FUNCTION public.update_usage_tracking(
  p_user_id UUID,
  p_model_name TEXT,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER,
  p_total_cost DECIMAL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id, model_name, input_tokens, output_tokens, total_cost, question_count, date)
  VALUES (p_user_id, p_model_name, p_input_tokens, p_output_tokens, p_total_cost, 1, CURRENT_DATE)
  ON CONFLICT (user_id, model_name, date)
  DO UPDATE SET
    input_tokens = usage_tracking.input_tokens + p_input_tokens,
    output_tokens = usage_tracking.output_tokens + p_output_tokens,
    total_cost = usage_tracking.total_cost + p_total_cost,
    question_count = usage_tracking.question_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check usage limits
CREATE OR REPLACE FUNCTION public.check_usage_limits(
  p_user_id UUID,
  p_subscription_tier TEXT DEFAULT 'free'
)
RETURNS TABLE(
  daily_used INTEGER,
  daily_limit INTEGER,
  monthly_used INTEGER,
  monthly_limit INTEGER,
  can_ask BOOLEAN
) AS $$
DECLARE
  v_daily_used INTEGER;
  v_monthly_used INTEGER;
  v_limits RECORD;
BEGIN
  -- Get subscription limits
  SELECT daily_question_limit, monthly_question_limit 
  INTO v_limits
  FROM public.subscription_limits 
  WHERE tier_name = p_subscription_tier;
  
  -- Get daily usage
  SELECT COALESCE(SUM(question_count), 0)
  INTO v_daily_used
  FROM public.usage_tracking
  WHERE user_id = p_user_id AND date = CURRENT_DATE;
  
  -- Get monthly usage
  SELECT COALESCE(SUM(question_count), 0)
  INTO v_monthly_used
  FROM public.usage_tracking
  WHERE user_id = p_user_id 
    AND date >= DATE_TRUNC('month', CURRENT_DATE)
    AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
  
  RETURN QUERY SELECT 
    v_daily_used,
    v_limits.daily_question_limit,
    v_monthly_used,
    v_limits.monthly_question_limit,
    (v_daily_used < v_limits.daily_question_limit AND v_monthly_used < v_limits.monthly_question_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at
CREATE TRIGGER update_model_pricing_updated_at
  BEFORE UPDATE ON public.model_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_limits_updated_at
  BEFORE UPDATE ON public.subscription_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();