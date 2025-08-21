import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Zap, Eye, Calendar } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuthMock";

export function PremiumSubscription() {
  const { user } = useAuth();
  const { subscription, loading, isPremiumUser, isSubscribed, upgradeToPremium, cancelSubscription } = useSubscription();

  if (!user) return null;
  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`transition-all duration-300 ${isPremiumUser ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900' : 'border-dashed border-muted-foreground/50 hover:border-primary/50'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className={`h-5 w-5 ${isPremiumUser ? 'text-blue-500' : 'text-muted-foreground'}`} />
            {isPremiumUser ? "프리미엄 회원" : "프리미엄 플랜"}
            {isPremiumUser && <Badge className="bg-blue-500 hover:bg-blue-600">Premium</Badge>}
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isPremiumUser ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {subscription?.subscription_end ? 
                  `만료일: ${new Date(subscription.subscription_end).toLocaleDateString('ko-KR')}` : 
                  '무제한'
                }
              </span>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">사용 가능한 프리미엄 기능:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Google Vision OCR (더 정확한 텍스트 인식)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>무제한 오답노트 생성</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>고급 PDF 템플릿</span>
                </div>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={cancelSubscription}
              className="w-full"
            >
              구독 취소
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                프리미엄으로 업그레이드하고 더 나은 학습 경험을 누리세요
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span>Google Vision OCR - 99% 정확도</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span>무제한 오답노트 생성</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Crown className="h-4 w-4 text-blue-500" />
                  <span>프리미엄 PDF 템플릿</span>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">₩9,900</div>
              <div className="text-sm text-muted-foreground">월</div>
            </div>
            
            <Button 
              onClick={upgradeToPremium}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <Crown className="h-4 w-4 mr-2" />
              프리미엄으로 업그레이드
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              * 현재는 테스트용으로 무료 업그레이드가 가능합니다
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}