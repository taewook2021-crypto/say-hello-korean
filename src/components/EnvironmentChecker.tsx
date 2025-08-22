import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, AlertTriangle, CheckCircle, XCircle, Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EnvironmentInfo {
  isIframe: boolean;
  currentUrl: string;
  userAgent: string;
  supabaseStatus: 'checking' | 'connected' | 'failed';
  isDevelopment: boolean;
}

export const EnvironmentChecker: React.FC = () => {
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo>({
    isIframe: false,
    currentUrl: '',
    userAgent: '',
    supabaseStatus: 'checking',
    isDevelopment: false
  });
  const [showDevInfo, setShowDevInfo] = useState(false);

  useEffect(() => {
    // 환경 정보 수집
    const isIframe = window.parent !== window;
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname.includes('preview--');

    setEnvInfo(prev => ({
      ...prev,
      isIframe,
      currentUrl: window.location.href,
      userAgent: navigator.userAgent,
      isDevelopment: isDev
    }));

    // Supabase 연결 테스트
    testSupabaseConnection();
  }, []);

  const testSupabaseConnection = async () => {
    try {
      console.log('🔍 Supabase 연결 테스트 중...');
      
      // 간단한 연결 테스트
      const { error } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      if (error && error.code !== 'PGRST301') {
        // PGRST301은 RLS 오류이므로 연결은 성공한 것
        console.error('❌ Supabase 연결 실패:', error);
        setEnvInfo(prev => ({ ...prev, supabaseStatus: 'failed' }));
      } else {
        console.log('✅ Supabase 연결 성공');
        setEnvInfo(prev => ({ ...prev, supabaseStatus: 'connected' }));
      }
    } catch (error) {
      console.error('❌ Supabase 연결 테스트 실패:', error);
      setEnvInfo(prev => ({ ...prev, supabaseStatus: 'failed' }));
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const getSupabaseStatusIcon = () => {
    switch (envInfo.supabaseStatus) {
      case 'checking':
        return <Monitor className="h-4 w-4 animate-spin" />;
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getSupabaseStatusText = () => {
    switch (envInfo.supabaseStatus) {
      case 'checking':
        return '연결 확인 중...';
      case 'connected':
        return '정상 연결됨';
      case 'failed':
        return '연결 실패';
    }
  };

  return (
    <div className="space-y-4">
      {/* iframe 경고 배너 */}
      {envInfo.isIframe && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-yellow-800">
              ⚠️ 일부 기능이 제한될 수 있습니다. 새 탭에서 열기를 권장합니다.
            </span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={openInNewTab}
              className="ml-4 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              새 탭에서 열기
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Supabase 연결 실패 경고 */}
      {envInfo.supabaseStatus === 'failed' && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-2">
              <p className="font-medium">데이터베이스 연결에 실패했습니다.</p>
              {envInfo.isIframe && (
                <p className="text-sm">
                  iframe 환경에서는 데이터베이스 연결이 제한될 수 있습니다. 
                  <Button 
                    size="sm" 
                    variant="link" 
                    onClick={openInNewTab}
                    className="p-0 h-auto text-red-700 underline ml-1"
                  >
                    새 탭에서 시도해보세요
                  </Button>
                </p>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={testSupabaseConnection}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                다시 연결 시도
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 개발 모드 정보 표시 */}
      {envInfo.isDevelopment && (
        <div className="space-y-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDevInfo(!showDevInfo)}
            className="text-xs text-muted-foreground"
          >
            <Monitor className="h-3 w-3 mr-1" />
            개발 환경 정보 {showDevInfo ? '숨기기' : '보기'}
          </Button>
          
          {showDevInfo && (
            <Card className="border-dashed">
              <CardContent className="p-3 space-y-2">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={envInfo.isIframe ? 'destructive' : 'secondary'}>
                      {envInfo.isIframe ? 'iframe' : '직접 브라우저'}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {getSupabaseStatusIcon()}
                      <span>Supabase: {getSupabaseStatusText()}</span>
                    </div>
                  </div>
                  <div>
                    <strong>URL:</strong> {envInfo.currentUrl}
                  </div>
                  <div>
                    <strong>User Agent:</strong> {envInfo.userAgent.substring(0, 60)}...
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};