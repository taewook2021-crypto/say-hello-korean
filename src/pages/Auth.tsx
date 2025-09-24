import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import remindLogo from '@/assets/remind-logo.png';

export default function Auth() {
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    // Redirect to home if user is already authenticated
    if (user && !loading) {
      navigate('/');
    }

    // Detect in-app browsers (KakaoTalk, Naver, etc.)
    const detectInAppBrowser = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isKakaoTalk = userAgent.includes('kakaotalk');
      const isNaver = userAgent.includes('naver');
      const isLine = userAgent.includes('line');
      const isFacebook = userAgent.includes('fban') || userAgent.includes('fbav');
      const isInstagram = userAgent.includes('instagram');
      
      return isKakaoTalk || isNaver || isLine || isFacebook || isInstagram;
    };

    setIsInAppBrowser(detectInAppBrowser());
  }, [user, loading, navigate]);

  const handleGoogleSignIn = async () => {
    if (isInAppBrowser) {
      toast({
        title: "외부 브라우저에서 로그인해주세요",
        description: "카카오톡 등의 앱 내에서는 Google 로그인이 제한됩니다. 우측 상단의 '외부 브라우저에서 열기'를 눌러주세요.",
        duration: 5000,
      });
      return;
    }

    try {
      await signInWithGoogle();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "로그인 실패",
        description: "Google 로그인 중 오류가 발생했습니다. 다시 시도해주세요.",
      });
    }
  };

  const handleOpenInBrowser = () => {
    const currentUrl = window.location.href;
    // Try different methods to open in external browser
    window.open(currentUrl, '_blank');
    
    toast({
      title: "브라우저가 열렸나요?",
      description: "외부 브라우저가 열리지 않으면 URL을 복사해서 직접 브라우저에 붙여넣어 주세요.",
      duration: 3000,
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
      {/* Main Content - Takes full height */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Logo Section */}
        <div className="mb-8 text-center">
          <div className="relative mb-6">
            <img 
              src={remindLogo} 
              alt="Re:Mind" 
              className="h-40 w-auto mx-auto drop-shadow-lg"
            />
          </div>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            똑똑한 학습 관리로 더 효율적인 공부를 시작하세요
          </p>
        </div>

        {/* In-App Browser Warning */}
        {isInAppBrowser && (
          <Alert className="w-full max-w-md mb-4 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
            <AlertDescription className="text-sm">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <div className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                    인앱 브라우저에서는 Google 로그인이 제한됩니다
                  </div>
                  <div className="text-orange-700 dark:text-orange-300">
                    우측 상단의 메뉴에서 "외부 브라우저에서 열기"를 선택해주세요
                  </div>
                  <Button 
                    onClick={handleOpenInBrowser}
                    className="mt-2 h-8 px-3 text-xs bg-orange-600 hover:bg-orange-700"
                    size="sm"
                  >
                    외부 브라우저에서 열기
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Login Card */}
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md mb-8">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">시작하기</CardTitle>
            <CardDescription className="text-base">
              Google 계정으로 간편하게 로그인하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button 
              onClick={handleGoogleSignIn}
              className={`w-full h-12 text-base font-medium relative overflow-hidden group hover:scale-[1.02] transition-all duration-200 ${
                isInAppBrowser ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              size="lg"
              disabled={isInAppBrowser}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 group-hover:from-blue-700 group-hover:to-blue-800 transition-all duration-200"></div>
              <div className="relative flex items-center justify-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google로 계속하기
              </div>
            </Button>
            
            <div className="text-center text-sm text-muted-foreground leading-relaxed">
              계속 진행하면{' '}
              <span className="text-primary font-medium">서비스 이용약관</span>과{' '}
              <span className="text-primary font-medium">개인정보 처리방침</span>에 
              동의하는 것으로 간주됩니다
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Preview - Bottom section */}
      <div className="w-full px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="text-center p-4 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1 text-sm">스마트 진도관리</h3>
            <p className="text-xs text-muted-foreground">과목별 학습 진도를 체계적으로 관리</p>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1 text-sm">단권화</h3>
            <p className="text-xs text-muted-foreground">핵심 내용을 한 권으로 정리하는 효율적인 학습법</p>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1 text-sm">학습성취 추적</h3>
            <p className="text-xs text-muted-foreground">목표 달성도와 학습 패턴을 한눈에 확인</p>
          </div>
        </div>
      </div>
    </div>
  );
}