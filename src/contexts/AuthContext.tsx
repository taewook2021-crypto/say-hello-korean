import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔥 Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('✅ User authenticated:', session.user.id);
          // Fetch user profile
          setTimeout(async () => {
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
              
              if (error) {
                console.error('Error fetching profile:', error);
              } else {
                setProfile(profileData);
              }
            } catch (error) {
              console.error('Error fetching profile:', error);
            }
          }, 0);

          // Phase 3: 로그인 시 LocalStorage 마이그레이션 안내
          if (event === 'SIGNED_IN') {
            checkLocalStorageData(session.user.id);
          }
        } else {
          console.log('❌ User not authenticated');
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch user profile for existing session
        setTimeout(async () => {
          try {
            const { data: profileData, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (error) {
              console.error('Error fetching profile:', error);
            } else {
              setProfile(profileData);
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
          }
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // LocalStorage 데이터 확인 및 안내
  const checkLocalStorageData = (userId: string) => {
    const migrationCompleted = localStorage.getItem('migration_completed');
    
    // 이미 마이그레이션 완료했으면 스킵
    if (migrationCompleted === 'true') return;

    // LocalStorage에 study_rounds 데이터가 있는지 확인
    const prefix = `study_rounds_${userId}_`;
    let hasLocalData = false;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        hasLocalData = true;
        break;
      }
    }

    if (hasLocalData) {
      // 3초 후에 Toast 표시 (로그인 완료 후)
      setTimeout(() => {
        const { toast } = require('sonner');
        toast.info(
          '브라우저에 저장된 학습 기록이 있습니다.',
          {
            description: '백업 페이지에서 데이터를 백업하세요.',
            action: {
              label: '백업하기',
              onClick: () => {
                window.location.href = '/backup';
              }
            },
            duration: 10000
          }
        );
      }, 3000);
    }
  };

  const signInWithGoogle = async () => {
    console.log('🔗 Current origin:', window.location.origin);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google'
    });
    
    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clear local state first to prevent multiple logout attempts
      setUser(null);
      setSession(null);
      setProfile(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        // Don't throw error for session_not_found as it means user is already logged out
        if (error.message !== 'Session not found') {
          throw error;
        }
      }
      
      // Clear any local storage data
      localStorage.removeItem('aro-study-data');
      
      // Force redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, clear local state and redirect
      setUser(null);
      setSession(null);
      setProfile(null);
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signInWithGoogle,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}