import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  subscription_tier: string | null;
  created_at: string;
  updated_at: string;
}

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

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSubscription();
    } else {
      setProfile(null);
      setSubscription(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

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
    } finally {
      setLoading(false);
    }
  };

  const isPremiumUser = subscription?.subscription_tier === 'premium';

  return {
    profile,
    subscription,
    loading,
    isPremiumUser,
    refetch: () => {
      fetchProfile();
      fetchSubscription();
    }
  };
}