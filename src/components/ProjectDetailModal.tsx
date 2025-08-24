import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectCalendar } from './ProjectCalendar';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeName: string;
}

interface NodeData {
  id: string;
  name: string;
  description?: string;
  deadline?: string;
  created_at: string;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  isOpen,
  onClose,
  nodeId,
  nodeName
}) => {
  const [nodeData, setNodeData] = useState<NodeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && nodeId) {
      loadNodeData();
    }
  }, [isOpen, nodeId]);

  const loadNodeData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', nodeId)
        .single();

      if (error) throw error;
      setNodeData(data);
    } catch (error) {
      console.error('노드 데이터 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{nodeName} 프로젝트 상세</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="calendar" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">프로젝트 정보</TabsTrigger>
              <TabsTrigger value="calendar">캘린더 보기</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">프로젝트 설명</h3>
                  <p className="text-muted-foreground">
                    {nodeData?.description || '설명이 없습니다.'}
                  </p>
                </div>
                
                {nodeData?.deadline && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">마감일</h3>
                    <p className="text-destructive font-medium">
                      {new Date(nodeData.deadline).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </p>
                  </div>
                )}
                
                <div>
                  <h3 className="font-semibold text-lg mb-2">생성일</h3>
                  <p className="text-muted-foreground">
                    {new Date(nodeData?.created_at || '').toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="calendar">
              {nodeData && (
                <ProjectCalendar
                  nodeId={nodeId}
                  nodeName={nodeName}
                  deadline={nodeData.deadline ? new Date(nodeData.deadline) : undefined}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};