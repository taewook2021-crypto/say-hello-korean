import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, BookOpen, Calendar, Smartphone, Monitor, Tablet, AlertTriangle, Chrome } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Landing = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    // Detect in-app browsers
    const userAgent = navigator.userAgent.toLowerCase();
    const isInApp = 
      userAgent.includes('instagram') ||
      userAgent.includes('kakaotalk') ||
      userAgent.includes('naver') ||
      userAgent.includes('facebook') ||
      userAgent.includes('line') ||
      userAgent.includes('wechat') ||
      (userAgent.includes('mobile') && !userAgent.includes('chrome') && !userAgent.includes('safari'));
    
    setIsInAppBrowser(isInApp);
  }, []);

  const handleGetStarted = () => {
    if (isInAppBrowser) {
      // Show guide to open in external browser
      return;
    }
    navigate('/auth');
  };

  const openInBrowser = () => {
    const currentUrl = window.location.href.replace('/auth', '');
    if (navigator.share) {
      navigator.share({
        title: 'Re:Mind - CPA 학습도우미',
        url: currentUrl
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(currentUrl);
      alert('링크가 복사되었습니다. 브라우저에서 붙여넣기 해주세요.');
    }
  };

  const features = [
    {
      icon: BookOpen,
      title: "스마트 오답노트",
      description: "틀린 문제를 체계적으로 관리하고 반복 학습으로 완벽하게 이해하세요.",
      highlight: "AI 기반 분석"
    },
    {
      icon: Calendar,
      title: "맞춤형 복습 스케줄",
      description: "에빙하우스 망각곡선을 기반으로 한 과학적인 복습 일정을 자동으로 생성합니다.",
      highlight: "과학적 근거"
    },
    {
      icon: Brain,
      title: "AI 퀴즈 생성",
      description: "학습한 내용을 바탕으로 실전같은 문제를 자동 생성하여 실력을 점검하세요.",
      highlight: "무한 문제"
    }
  ];

  const stats = [
    { label: "누적 사용자", value: "30+" },
    { label: "생성된 오답노트", value: "100+" },
    { label: "평균 학습 시간", value: "13분" },
    { label: "문제 해결률", value: "89%" }
  ];

  if (isInAppBrowser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <CardTitle>외부 브라우저에서 열어주세요</CardTitle>
            <CardDescription>
              Re:Mind는 데스크톱과 태블릿에 최적화되어 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Chrome className="h-6 w-6 text-blue-500" />
              <div>
                <p className="font-medium">Chrome에서 열기</p>
                <p className="text-sm text-muted-foreground">권장 브라우저</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Smartphone className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium">Safari에서 열기</p>
                <p className="text-sm text-muted-foreground">iOS 사용자</p>
              </div>
            </div>
            <Button onClick={openInBrowser} className="w-full">
              외부 브라우저에서 열기
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              우측 상단 메뉴(⋯)를 눌러 '브라우저에서 열기'를 선택하세요
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/src/assets/remind-logo.png" alt="Re:Mind" className="h-8 w-8" />
            <span className="text-xl font-bold">Re:Mind</span>
          </div>
          <Button onClick={handleGetStarted} size="sm">
            시작하기
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            CPA 수험생을 위한 스마트 학습도구
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Re:Mind
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            AI 기반 오답노트와 맞춤형 복습으로<br />
            CPA 합격까지 체계적으로 학습하세요
          </p>
          
          {/* Device Recommendations */}
          <div className="mb-8 p-4 bg-card rounded-lg border">
            <h3 className="font-semibold mb-3">최적 사용 환경</h3>
            <div className="flex justify-center gap-6">
              <div className="flex items-center gap-2 text-green-600">
                <Monitor className="h-5 w-5" />
                <span className="text-sm">데스크톱</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <Tablet className="h-5 w-5" />
                <span className="text-sm">태블릿</span>
              </div>
              <div className="flex items-center gap-2 text-amber-600">
                <Smartphone className="h-5 w-5" />
                <span className="text-sm">모바일 (제한적)</span>
              </div>
            </div>
          </div>

          <Button onClick={handleGetStarted} size="lg" className="mb-4">
            무료로 시작하기
          </Button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center">
              <CardContent className="p-6">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            CPA 학습의 새로운 기준
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            과학적 학습 방법론과 AI 기술을 결합하여 효율적인 학습 경험을 제공합니다
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="outline" className="mb-2 w-fit mx-auto">
                  {feature.highlight}
                </Badge>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-4xl mx-auto text-center bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-12">
            <h2 className="text-3xl font-bold mb-4">
              지금 시작하여 학습 효율을 높이세요
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              무료로 시작하고, 체계적인 학습으로 CPA 합격에 한 걸음 더 가까워지세요
            </p>
            <div className="flex justify-center">
              <Button onClick={handleGetStarted} size="lg">
                무료 회원가입
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              신용카드 불필요 · 즉시 이용 가능
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/src/assets/remind-logo.png" alt="Re:Mind" className="h-6 w-6" />
            <span className="font-semibold">Re:Mind</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Re:Mind. CPA 수험생을 위한 스마트 학습 도우미
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;