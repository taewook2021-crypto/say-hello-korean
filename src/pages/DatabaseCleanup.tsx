import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { deleteAllWrongNotes } from "@/utils/deleteAllWrongNotes";
import { supabase } from "@/integrations/supabase/client";

export default function DatabaseCleanup() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [noteCount, setNoteCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchNoteCount = async () => {
    setLoading(true);
    try {
      const { count } = await supabase
        .from('wrong_notes')
        .select('*', { count: 'exact', head: true });
      setNoteCount(count || 0);
    } catch (error) {
      console.error('오답노트 수 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('정말로 모든 오답노트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteAllWrongNotes();
      setNoteCount(0);
    } finally {
      setIsDeleting(false);
    }
  };

  React.useEffect(() => {
    fetchNoteCount();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">데이터베이스 정리</h1>
        <p className="text-muted-foreground">
          테스트용으로 생성된 데이터를 정리할 수 있습니다.
        </p>
      </div>

      <div className="space-y-6">
        {/* 현재 상태 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              현재 데이터 상태
            </CardTitle>
            <CardDescription>
              데이터베이스에 저장된 오답노트 현황
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 오답노트 수</p>
                <p className="text-2xl font-bold">
                  {loading ? '로딩 중...' : `${noteCount || 0}개`}
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={fetchNoteCount}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                새로고침
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 삭제 작업 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              모든 오답노트 삭제
            </CardTitle>
            <CardDescription>
              데이터베이스에 있는 모든 오답노트와 관련 데이터를 삭제합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>주의:</strong> 이 작업은 되돌릴 수 없습니다. 모든 오답노트, 복습 스케줄, 학습 세션 기록이 영구적으로 삭제됩니다.
              </AlertDescription>
            </Alert>
            
            <div className="pt-4">
              <Button 
                variant="destructive" 
                onClick={handleDeleteAll}
                disabled={isDeleting || noteCount === 0}
                className="w-full"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    모든 오답노트 삭제 ({noteCount || 0}개)
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}