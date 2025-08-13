import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface Subscription {
  id: string;
  user_id: string;
  email: string;
  subscribed: boolean;
  subscription_tier: string;
  subscription_end?: string;
  updated_at: string;
  created_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const isPremiumUser = subscription?.subscription_tier === 'premium';
  const isSubscribed = subscription?.subscribed || false;

  useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [user]);

  const fetchSubscription = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setSubscription(data);
      } else {
        // Create initial subscription record
        const { data: newSub, error: insertError } = await supabase
          .from('subscribers')
          .insert({
            user_id: user.id,
            email: user.email,
            subscribed: false,
            subscription_tier: 'free'
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setSubscription(newSub);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast({
        title: "오류",
        description: "구독 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const upgradeToPremium = async () => {
    if (!user?.id || !subscription) return;

    try {
      const subscriptionEnd = new Date();
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1); // 1개월 후

      const { error } = await supabase
        .from('subscribers')
        .update({
          subscribed: true,
          subscription_tier: 'premium',
          subscription_end: subscriptionEnd.toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchSubscription();
      
      toast({
        title: "프리미엄 업그레이드 완료!",
        description: "이제 Google Vision OCR 등 프리미엄 기능을 사용할 수 있습니다.",
      });
    } catch (error) {
      console.error('Error upgrading to premium:', error);
      toast({
        title: "오류",
        description: "프리미엄 업그레이드에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const cancelSubscription = async () => {
    if (!user?.id || !subscription) return;

    try {
      const { error } = await supabase
        .from('subscribers')
        .update({
          subscribed: false,
          subscription_tier: 'free',
          subscription_end: null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchSubscription();
      
      toast({
        title: "구독 취소 완료",
        description: "무료 플랜으로 변경되었습니다.",
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: "오류",
        description: "구독 취소에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  return {
    subscription,
    loading,
    isPremiumUser,
    isSubscribed,
    upgradeToPremium,
    cancelSubscription,
    refetch: fetchSubscription
  };
}