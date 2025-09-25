import { BackupManager } from "@/components/BackupManager";

export default function Backup() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">데이터 백업 관리</h1>
        <p className="text-muted-foreground">
          학습 데이터의 안전성을 보장하는 종합 백업 시스템을 관리하세요.
        </p>
      </div>
      
      <BackupManager />
    </div>
  );
}