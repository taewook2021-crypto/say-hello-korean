import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsageData {
  daily_used: number;
  daily_limit: number;
  monthly_used: number;
  monthly_limit: number;
  can_ask: boolean;
}

interface ModelPricing {
  model_name: string;
  input_price_per_1k_tokens: number;
  output_price_per_1k_tokens: number;
  description: string;
  features: string[];
}

interface SubscriptionLimits {
  tier_name: string;
  daily_question_limit: number;
  monthly_question_limit: number;
  allowed_models: string[];
  price_monthly: number;
}

export function useUsageTracking() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [modelPricing, setModelPricing] = useState<ModelPricing[]>([]);
  const [subscriptionLimits, setSubscriptionLimits] = useState<SubscriptionLimits[]>([]);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(false);

  // Load model pricing and subscription limits
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load model pricing
        const { data: pricing, error: pricingError } = await supabase
          .from('model_pricing')
          .select('*')
          .eq('is_active', true)
          .order('input_price_per_1k_tokens');

        if (pricingError) throw pricingError;
        setModelPricing(pricing || []);

        // Load subscription limits
        const { data: limits, error: limitsError } = await supabase
          .from('subscription_limits')
          .select('*')
          .order('price_monthly');

        if (limitsError) throw limitsError;
        setSubscriptionLimits(limits || []);

        // 로그인 기능이 없으므로 로컬 스토리지에서 플랜 정보 읽기 (임시)
        const savedPlan = localStorage.getItem('currentPlan');
        console.log('Saved plan from localStorage:', savedPlan);
        
        if (savedPlan) {
          const dbTier = savedPlan === '무료' ? 'free' : 
                        savedPlan === '베이직' ? 'basic' : 'pro';
          console.log('Converted tier:', dbTier);
          setCurrentTier(dbTier);
        } else {
          console.log('No saved plan, using default: free');
          setCurrentTier('free'); // 기본값
        }
      } catch (error) {
        console.error('Error loading usage data:', error);
        toast.error('사용량 정보를 불러오는데 실패했습니다.');
      }
    };

    loadData();
  }, []);

  // Check usage limits (임시로 더미 데이터 반환)
  const checkUsageLimits = useCallback(async () => {
    try {
      // 현재 구독 플랜에 따른 더미 사용량 데이터
      const savedPlan = localStorage.getItem('currentPlan');
      const tier = savedPlan === '무료' ? 'free' : 
                  savedPlan === '베이직' ? 'basic' : 'pro';
      
      let dummyData;
      if (tier === 'free') {
        dummyData = {
          daily_used: 3,
          daily_limit: 5,
          monthly_used: 24,
          monthly_limit: 50,
          can_ask: true
        };
      } else if (tier === 'basic') {
        dummyData = {
          daily_used: 12,
          daily_limit: 50,
          monthly_used: 156,
          monthly_limit: 500,
          can_ask: true
        };
      } else { // pro
        dummyData = {
          daily_used: 28,
          daily_limit: 999,
          monthly_used: 342,
          monthly_limit: 9999,
          can_ask: true
        };
      }

      setUsageData(dummyData);
      return dummyData;
    } catch (error) {
      console.error('Error checking usage limits:', error);
    }
    return null;
  }, []);

  // Update usage (임시로 비활성화)
  const updateUsage = useCallback(async (modelName: string, inputTokens: number, outputTokens: number) => {
    // 로그인 기능이 없으므로 임시로 비활성화
    console.log('Usage update (disabled):', { modelName, inputTokens, outputTokens });
    
    // 사용량 데이터 새로고침
    await checkUsageLimits();
  }, [checkUsageLimits]);

  // Calculate estimated cost for a message
  const calculateEstimatedCost = useCallback((
    modelName: string,
    estimatedTokens: number
  ) => {
    const pricing = modelPricing.find(p => p.model_name === modelName);
    if (!pricing) return 0;

    // Rough estimate: 75% input, 25% output tokens
    const inputTokens = Math.round(estimatedTokens * 0.75);
    const outputTokens = Math.round(estimatedTokens * 0.25);
    
    const inputCost = (inputTokens / 1000) * pricing.input_price_per_1k_tokens;
    const outputCost = (outputTokens / 1000) * pricing.output_price_per_1k_tokens;
    
    return inputCost + outputCost;
  }, [modelPricing]);

  // Get allowed models for current tier
  const getAllowedModels = useCallback(() => {
    console.log('Getting allowed models for tier:', currentTier);
    console.log('Available subscription limits:', subscriptionLimits);
    const tierLimits = subscriptionLimits.find(l => l.tier_name === currentTier);
    console.log('Found tier limits:', tierLimits);
    const allowedModels = tierLimits?.allowed_models || ['gpt-4o-mini'];
    console.log('Allowed models:', allowedModels);
    return allowedModels;
  }, [subscriptionLimits, currentTier]);

  // Get usage percentage
  const getUsagePercentage = useCallback((type: 'daily' | 'monthly') => {
    if (!usageData) return 0;
    
    if (type === 'daily') {
      return (usageData.daily_used / usageData.daily_limit) * 100;
    } else {
      return (usageData.monthly_used / usageData.monthly_limit) * 100;
    }
  }, [usageData]);

  return {
    usageData,
    modelPricing,
    subscriptionLimits,
    currentTier,
    isLoading,
    checkUsageLimits,
    updateUsage,
    calculateEstimatedCost,
    getAllowedModels,
    getUsagePercentage,
    setCurrentTier
  };
}