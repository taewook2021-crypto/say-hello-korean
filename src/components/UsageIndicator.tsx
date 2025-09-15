import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Calendar, CalendarDays, Crown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UsageData {
  daily_used: number;
  daily_limit: number;
  monthly_used: number;
  monthly_limit: number;
  can_ask: boolean;
}

interface UsageIndicatorProps {
  usageData: UsageData | null;
  currentTier: string;
  isLoading?: boolean;
}

const getTierIcon = (tier: string) => {
  switch (tier) {
    case 'premium':
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case 'basic':
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'premium':
      return 'bg-gradient-to-r from-yellow-500 to-orange-500';
    case 'basic':
      return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    default:
      return 'bg-gradient-to-r from-gray-400 to-gray-500';
  }
};

const getUsageColor = (percentage: number) => {
  if (percentage >= 95) return 'bg-red-500';
  if (percentage >= 80) return 'bg-yellow-500';
  return 'bg-green-500';
};

const formatTierName = (tier: string) => {
  switch (tier) {
    case 'premium':
      return '프리미엄';
    case 'basic':
      return '베이직';
    default:
      return '무료';
  }
};

export default function UsageIndicator({ usageData, currentTier, isLoading }: UsageIndicatorProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-2 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usageData) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">사용량 정보를 불러올 수 없습니다</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dailyPercentage = (usageData.daily_used / usageData.daily_limit) * 100;
  const monthlyPercentage = (usageData.monthly_used / usageData.monthly_limit) * 100;

  return (
    <div className="space-y-4">
      {/* 구독 등급 표시 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            {getTierIcon(currentTier)}
            구독 등급: {formatTierName(currentTier)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className={`h-1 rounded-full ${getTierColor(currentTier)}`}></div>
        </CardContent>
      </Card>

      {/* 사용량 표시 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">사용량 현황</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 일일 사용량 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span>오늘 사용량</span>
              </div>
              <span className="font-medium">
                {usageData.daily_used}/{usageData.daily_limit}
              </span>
            </div>
            <Progress 
              value={dailyPercentage} 
              className="h-2"
            />
            <div className="text-xs text-muted-foreground">
              남은 질문: {Math.max(0, usageData.daily_limit - usageData.daily_used)}개
            </div>
          </div>

          {/* 월간 사용량 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-green-500" />
                <span>이번 달 사용량</span>
              </div>
              <span className="font-medium">
                {usageData.monthly_used}/{usageData.monthly_limit}
              </span>
            </div>
            <Progress 
              value={monthlyPercentage} 
              className="h-2"
            />
            <div className="text-xs text-muted-foreground">
              남은 질문: {Math.max(0, usageData.monthly_limit - usageData.monthly_used)}개
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 알림 */}
      {!usageData.can_ask && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            일일 또는 월간 사용 한도에 도달했습니다. 내일 또는 다음 달까지 기다리거나 구독을 업그레이드하세요.
          </AlertDescription>
        </Alert>
      )}

      {usageData.can_ask && (dailyPercentage >= 80 || monthlyPercentage >= 80) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {dailyPercentage >= 80 && monthlyPercentage >= 80 
              ? '일일 및 월간 사용량이 80%를 초과했습니다.'
              : dailyPercentage >= 80 
                ? '일일 사용량이 80%를 초과했습니다.'
                : '월간 사용량이 80%를 초과했습니다.'
            } 구독 업그레이드를 고려해보세요.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}