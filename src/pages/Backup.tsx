import { BackupManager } from "@/components/BackupManager";
import { useFullMigration } from "@/hooks/useFullMigration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Database, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Backup() {
  const { 
    isMigrating, 
    progress, 
    startMigration, 
    resetMigration,
    migrationCompleted,
    migrationCompletedAt
  } = useFullMigration();

  const progressPercentage = progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">데이터 백업 관리</h1>
        <p className="text-muted-foreground">
          학습 데이터의 안전성을 보장하는 종합 백업 시스템을 관리하세요.
        </p>
      </div>

      {/* LocalStorage → DB 마이그레이션 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                LocalStorage → DB 전체 백업
              </CardTitle>
              <CardDescription>
                브라우저에 저장된 모든 회독 기록을 데이터베이스로 백업합니다.
              </CardDescription>
            </div>
            {migrationCompleted && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                백업 완료
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 마이그레이션 완료 정보 */}
          {migrationCompleted && migrationCompletedAt && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                마이그레이션 완료
              </div>
              <p className="text-sm text-muted-foreground">
                완료 시간: {new Date(migrationCompletedAt).toLocaleString('ko-KR')}
              </p>
            </div>
          )}

          {/* 진행 중일 때 */}
          {isMigrating && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {progress.completed} / {progress.total} 완료
                </span>
                <span className="font-medium">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              
              {progress.failed > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                  실패: {progress.failed}개
                </div>
              )}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-2">
            <Button 
              onClick={startMigration}
              disabled={isMigrating}
              className="flex-1"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  백업 중...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  전체 백업 시작
                </>
              )}
            </Button>
            
            {migrationCompleted && (
              <Button 
                onClick={resetMigration}
                variant="outline"
                disabled={isMigrating}
              >
                상태 초기화
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            💡 이 기능은 브라우저에 저장된 모든 회독 기록을 데이터베이스로 백업합니다. 
            백업 후에는 다른 기기에서도 동일한 데이터를 확인할 수 있습니다.
          </p>
        </CardContent>
      </Card>
      
      <BackupManager />
    </div>
  );
}