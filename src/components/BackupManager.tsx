import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Download, RefreshCw, Calendar, Database, FileText, Book, Brain, Target } from 'lucide-react';

interface BackupSummary {
  backup_date: string;
  subjects_count: number;
  books_count: number;
  chapters_count: number;
  wrong_notes_count: number;
  study_progress_count: number;
  backup_size_kb: number;
}

interface BackupHistory {
  operation_type: string;
  backup_timestamp: string;
  subject_name?: string;
  book_name?: string;
  chapter_name?: string;
}

export function BackupManager() {
  const [backups, setBackups] = useState<BackupSummary[]>([]);
  const [recentHistory, setRecentHistory] = useState<BackupHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualBackupLoading, setManualBackupLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = async () => {
    try {
      setLoading(true);

      // Load backup summary using the database function
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_user_backup_summary');

      if (summaryError) {
        console.error('Error loading backup summary:', summaryError);
        throw summaryError;
      }

      setBackups(summaryData || []);

      // Load recent backup history from multiple backup tables
      const [subjectsHistory, booksHistory, chaptersHistory, studyProgressHistory] = await Promise.all([
        supabase
          .from('subjects_backup')
          .select('operation_type, backup_timestamp, subject_name')
          .order('backup_timestamp', { ascending: false })
          .limit(10),
        supabase
          .from('books_backup')
          .select('operation_type, backup_timestamp, book_name, subject_name')
          .order('backup_timestamp', { ascending: false })
          .limit(10),
        supabase
          .from('chapters_backup')
          .select('operation_type, backup_timestamp, chapter_name, book_name, subject_name')
          .order('backup_timestamp', { ascending: false })
          .limit(10),
        supabase
          .from('study_progress_backup')
          .select('operation_type, backup_timestamp, subject_name, book_name, chapter_name')
          .order('backup_timestamp', { ascending: false })
          .limit(10),
      ]);

      // Combine and sort history
      const allHistory = [
        ...(subjectsHistory.data || []),
        ...(booksHistory.data || []),
        ...(chaptersHistory.data || []),
        ...(studyProgressHistory.data || []),
      ]
        .sort((a, b) => new Date(b.backup_timestamp).getTime() - new Date(a.backup_timestamp).getTime())
        .slice(0, 20);

      setRecentHistory(allHistory);

    } catch (error) {
      console.error('Error loading backup data:', error);
      toast({
        title: "백업 데이터 로드 실패",
        description: "백업 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerManualBackup = async () => {
    try {
      setManualBackupLoading(true);
      
      const { data, error } = await supabase.functions.invoke('daily-backup');
      
      if (error) throw error;

      if (data?.success) {
        toast({
          title: "수동 백업 완료",
          description: `백업이 성공적으로 완료되었습니다.`,
        });
        loadBackupData(); // 백업 데이터 새로고침
      } else {
        throw new Error(data?.error || '백업 실패');
      }
    } catch (error) {
      console.error('Manual backup error:', error);
      toast({
        title: "수동 백업 실패",
        description: "백업 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setManualBackupLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (sizeKb: number) => {
    if (sizeKb < 1024) {
      return `${sizeKb}KB`;
    }
    return `${(sizeKb / 1024).toFixed(1)}MB`;
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'INSERT': return <span className="text-green-500">+</span>;
      case 'UPDATE': return <span className="text-blue-500">✏️</span>;
      case 'DELETE': return <span className="text-red-500">🗑️</span>;
      default: return <span>•</span>;
    }
  };

  const getOperationDescription = (history: BackupHistory) => {
    const operation = history.operation_type === 'INSERT' ? '추가' : 
                    history.operation_type === 'UPDATE' ? '수정' : '삭제';
    
    if (history.chapter_name) {
      return `${history.subject_name} > ${history.book_name} > ${history.chapter_name} ${operation}`;
    } else if (history.book_name) {
      return `${history.subject_name} > ${history.book_name} ${operation}`;
    } else if (history.subject_name) {
      return `${history.subject_name} ${operation}`;
    }
    return `데이터 ${operation}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            데이터 백업 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>백업 정보를 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            데이터 백업 관리
          </CardTitle>
          <CardDescription>
            학습 데이터의 안전성을 보장하는 종합 백업 시스템입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={triggerManualBackup} 
              disabled={manualBackupLoading}
              className="flex items-center gap-2"
            >
              {manualBackupLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              수동 백업 실행
            </Button>
            <Button variant="outline" onClick={loadBackupData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
          </div>

          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">백업 요약</TabsTrigger>
              <TabsTrigger value="history">변경 기록</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              <div className="grid gap-4">
                {backups.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">아직 백업 데이터가 없습니다.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        첫 백업은 자동으로 매일 실행되거나 수동으로 실행할 수 있습니다.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  backups.map((backup, index) => (
                    <Card key={backup.backup_date}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formatDate(backup.backup_date)}
                          </CardTitle>
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            {formatFileSize(backup.backup_size_kb)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="flex items-center gap-2">
                            <Book className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-sm font-medium">{backup.subjects_count}</p>
                              <p className="text-xs text-muted-foreground">과목</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-sm font-medium">{backup.books_count}</p>
                              <p className="text-xs text-muted-foreground">교재</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-purple-500" />
                            <div>
                              <p className="text-sm font-medium">{backup.chapters_count}</p>
                              <p className="text-xs text-muted-foreground">챕터</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-red-500" />
                            <div>
                              <p className="text-sm font-medium">{backup.wrong_notes_count}</p>
                              <p className="text-xs text-muted-foreground">오답노트</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-orange-500" />
                            <div>
                              <p className="text-sm font-medium">{backup.study_progress_count}</p>
                              <p className="text-xs text-muted-foreground">학습진도</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">최근 변경 기록</CardTitle>
                  <CardDescription>
                    데이터 변경사항이 실시간으로 백업됩니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    {recentHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">변경 기록이 없습니다.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentHistory.map((history, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-center w-8 h-8 bg-background rounded-full">
                              {getOperationIcon(history.operation_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {getOperationDescription(history)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(history.backup_timestamp)}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {history.operation_type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}