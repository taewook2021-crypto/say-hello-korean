import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Calendar, CreditCard, Zap, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function UserAccount() {
  const { user, profile } = useAuth();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const subscriptionTier = profile?.subscription_tier || 'free';
  const isPremium = subscriptionTier === 'basic' || subscriptionTier === 'pro';

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <span className="text-white font-semibold text-lg">
            {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">계정 정보</h1>
          <p className="text-muted-foreground">학습 계정을 관리하세요</p>
        </div>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">이름</label>
              <p className="text-foreground">{profile?.full_name || '설정되지 않음'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">이메일</label>
              <p className="text-foreground">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">가입일</label>
              <p className="text-foreground">
                {profile?.created_at ? formatDate(profile.created_at) : '정보 없음'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 구독 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            구독 등급
          </CardTitle>
          <CardDescription>
            현재 구독 상태와 혜택을 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={isPremium ? "default" : "secondary"} className="text-sm">
                {isPremium ? (
                  <>
                    <Crown className="h-4 w-4 mr-1" />
                    {subscriptionTier === 'basic' ? '베이직' : '프로'}
                  </>
                ) : (
                  '무료'
                )}
              </Badge>
              {isPremium && (
                <span className="text-sm text-muted-foreground">
                  월 {subscriptionTier === 'basic' ? '4,900원' : '9,900원'}
                </span>
              )}
            </div>
            {!isPremium && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    <Crown className="h-4 w-4 mr-2" />
                    베이직 업그레이드
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      베이직 구독
                    </DialogTitle>
                    <DialogDescription>
                      Google Vision AI로 더 정확한 텍스트 인식을 경험하세요
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-foreground mb-2">월 4,900원</div>
                      <p className="text-sm text-muted-foreground">부가세 포함</p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">베이직 혜택</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          <span>Google Vision AI 텍스트 인식 (하루 50장)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          <span>한국어 인식 정확도 대폭 향상</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          <span>무료 사용자 대비 5배 정확한 OCR</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          <span>더 많은 GPT 사용량</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          <span>우선 지원 서비스</span>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <Button className="w-full" disabled>
                        <CreditCard className="h-4 w-4 mr-2" />
                        결제 시스템 준비 중
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        곧 출시될 예정입니다
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* 현재 플랜 혜택 */}
          <div className="p-4 rounded-lg bg-muted/30">
            <h4 className="font-medium text-foreground mb-2">
              {isPremium ? (subscriptionTier === 'basic' ? '베이직' : '프로') : '무료'} 플랜 혜택
            </h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {isPremium ? (
                <>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Google Vision AI 텍스트 인식 (하루 50장)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>한국어 인식 정확도 대폭 향상</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>더 많은 GPT 사용량</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>우선 지원 서비스</span>
                  </li>
                </>
              ) : (
                <>
                  <li>• 기본 Tesseract OCR 인식만 가능</li>
                  <li>• Google Vision AI 사용 불가</li>
                  <li>• 제한된 GPT 사용량</li>
                  <li>• 기본 지원 서비스</li>
                </>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}