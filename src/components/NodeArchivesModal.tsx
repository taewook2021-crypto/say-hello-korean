import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MessageSquare, Trash2 } from 'lucide-react';

interface NodeArchive {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface NodeArchivesModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeName: string;
  onConversationClick?: (conversationId: string) => void;
}

export const NodeArchivesModal: React.FC<NodeArchivesModalProps> = ({
  isOpen,
  onClose,
  nodeId,
  nodeName,
  onConversationClick
}) => {
  const [archives, setArchives] = useState<NodeArchive[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && nodeId) {
      loadArchives();
    }
  }, [isOpen, nodeId]);

  const loadArchives = async () => {
    setLoading(true);
    try {
      console.log('📂 노드 아카이브 조회 시작:', nodeId);

      // conversations 테이블에서 아카이브 조회 (node_id null로 저장된 아카이브 포함)
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .is('node_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ 아카이브 조회 오류:', error);
        throw error;
      }

      console.log('✅ 아카이브 조회 성공:', data?.length || 0, '개의 아카이브');
      console.log('📋 아카이브 데이터:', data);
      setArchives(data || []);
      
    } catch (error) {
      console.error('💥 아카이브 조회 실패:', error);
      toast.error('아카이브를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const deleteArchive = async (archiveId: string) => {
    if (!confirm('이 아카이브를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', archiveId);

      if (error) throw error;

      toast.success('아카이브가 삭제되었습니다.');
      loadArchives(); // 목록 새로고침
    } catch (error) {
      console.error('삭제 실패:', error);
      toast.error('아카이브 삭제에 실패했습니다.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare size={20} />
            {nodeName} - 아카이브 목록
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="p-8 text-center">
            아카이브를 불러오는 중...
          </div>
        ) : archives.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            저장된 아카이브가 없습니다.
          </div>
        ) : (
          <ScrollArea className="h-[60vh]">
            <div className="space-y-3 p-1">
              {archives.map((archive) => (
                <Card key={archive.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-lg">{archive.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {formatDistanceToNow(new Date(archive.created_at), {
                            addSuffix: true,
                            locale: ko
                          })}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteArchive(archive.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {archive.content.substring(0, 150)}
                      {archive.content.length > 150 ? '...' : ''}
                    </p>
                    
                    <div className="flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onConversationClick?.(archive.id)}
                      >
                        <MessageSquare size={14} className="mr-1" />
                        대화보기
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>닫기</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};