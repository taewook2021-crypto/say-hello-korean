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

        // Get current user's subscription tier from profiles
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', user.id)
            .single();
          
          if (profile?.subscription_tier) {
            setCurrentTier(profile.subscription_tier);
          }
        }
      } catch (error) {
        console.error('Error loading usage data:', error);
        toast.error('사용량 정보를 불러오는데 실패했습니다.');
      }
    };

    loadData();
  }, []);

  // Check usage limits
  const checkUsageLimits = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('check_usage_limits', {
        p_user_id: user.id,
        p_subscription_tier: currentTier
      });

      if (error) throw error;
      
      const usage = data?.[0];
      if (usage) {
        setUsageData(usage);
        return usage;
      }
    } catch (error) {
      console.error('Error checking usage limits:', error);
    }
    return null;
  }, [currentTier]);

  // Update usage tracking
  const updateUsage = useCallback(async (
    modelName: string,
    inputTokens: number,
    outputTokens: number
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Calculate cost
      const pricing = modelPricing.find(p => p.model_name === modelName);
      if (!pricing) return;

      const inputCost = (inputTokens / 1000) * pricing.input_price_per_1k_tokens;
      const outputCost = (outputTokens / 1000) * pricing.output_price_per_1k_tokens;
      const totalCost = inputCost + outputCost;

      const { error } = await supabase.rpc('update_usage_tracking', {
        p_user_id: user.id,
        p_model_name: modelName,
        p_input_tokens: inputTokens,
        p_output_tokens: outputTokens,
        p_total_cost: totalCost
      });

      if (error) throw error;

      // Refresh usage data
      await checkUsageLimits();
    } catch (error) {
      console.error('Error updating usage:', error);
      toast.error('사용량 업데이트에 실패했습니다.');
    }
  }, [modelPricing, checkUsageLimits]);

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
    const tierLimits = subscriptionLimits.find(l => l.tier_name === currentTier);
    return tierLimits?.allowed_models || ['gpt-4o-mini'];
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