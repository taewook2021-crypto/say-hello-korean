import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Shield, Database, Clock, RefreshCw } from 'lucide-react';

export function UserInfo() {
  const { user, session, profile, loading } = useAuth();
  const [directUser, setDirectUser] = useState<any>(null);
  const [localStorage, setLocalStorage] = useState<any>(null);
  const [usageStats, setUsageStats] = useState<any>(null);

  const checkDirectAuth = async () => {
    try {
      const { data: { user: directAuthUser }, error } = await supabase.auth.getUser();
      setDirectUser(directAuthUser);
      
      // localStorage 토큰 체크
      const authToken = window.localStorage.getItem('sb-xzuxqgnackvqwyvrymtl-auth-token');
      setLocalStorage(authToken ? JSON.parse(authToken) : null);
      
    } catch (error) {
      console.error('Direct auth check failed:', error);
    }
  };

  const fetchUsageStats = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(5);
      
      if (!error) {
        setUsageStats(data);
      }
    } catch (error) {
      console.error('Usage stats fetch failed:', error);
    }
  };

  useEffect(() => {
    checkDirectAuth();
    fetchUsageStats();
  }, [user]);

  const testSubjectAdd = async () => {
    try {
      const { data: { user: currentUser }, error: userErr } = await supabase.auth.getUser();
      console.log('🔍 Test - Direct user check:', currentUser);
      
      if (!currentUser) {
        console.log('❌ No user found');
        return;
      }

      const payload = { 
        name: '테스트과목_' + Date.now(), 
        user_id: currentUser.id 
      };
      console.log('📝 Test payload:', payload);
      
      const { data, error } = await supabase
        .from('subjects')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('❌ Test insert error:', error);
      } else {
        console.log('✅ Test insert success:', data);
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            사용자 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <Badge variant="secondary">로딩 중...</Badge>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AuthContext 정보 */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                AuthContext 상태
              </h4>
              <div className="text-sm space-y-1">
                <p><strong>User ID:</strong> {user?.id || '없음'}</p>
                <p><strong>Email:</strong> {user?.email || '없음'}</p>
                <p><strong>Full Name:</strong> {profile?.full_name || '없음'}</p>
                <p><strong>Loading:</strong> {loading ? '예' : '아니오'}</p>
                <Badge variant={user ? "default" : "destructive"}>
                  {user ? '로그인됨' : '로그인 안됨'}
                </Badge>
              </div>
            </div>

            {/* Direct Auth 정보 */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Database className="h-4 w-4" />
                Direct Auth 상태
              </h4>
              <div className="text-sm space-y-1">
                <p><strong>Direct User ID:</strong> {directUser?.id || '없음'}</p>
                <p><strong>Direct Email:</strong> {directUser?.email || '없음'}</p>
                <Badge variant={directUser ? "default" : "destructive"}>
                  {directUser ? '직접 인증됨' : '직접 인증 안됨'}
                </Badge>
              </div>
            </div>
          </div>

          {/* localStorage 토큰 정보 */}
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              토큰 상태
            </h4>
            <div className="text-sm">
              <p><strong>토큰 존재:</strong> {localStorage ? '예' : '아니오'}</p>
              {localStorage && (
                <>
                  <p><strong>만료 시간:</strong> {new Date(localStorage.expires_at * 1000).toLocaleString()}</p>
                  <p><strong>Provider:</strong> {localStorage.user?.app_metadata?.provider}</p>
                </>
              )}
            </div>
          </div>

          {/* 사용 통계 */}
          {usageStats && (
            <div className="space-y-2">
              <h4 className="font-semibold">최근 사용 기록</h4>
              <div className="text-sm space-y-1">
                {usageStats.map((stat: any, index: number) => (
                  <p key={index}>
                    {stat.date}: {stat.model_name} - {stat.question_count}회 사용
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={checkDirectAuth} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-1" />
              새로고침
            </Button>
            <Button onClick={testSubjectAdd} variant="outline" size="sm">
              과목 추가 테스트
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}