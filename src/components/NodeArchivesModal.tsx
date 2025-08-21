import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Archive {
  id: string;
  title: string;
  content_summary?: string;
  archive_type: string;
  created_at: string;
  conversation_id?: string;
}

interface NodeArchivesModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeName: string;
}

export const NodeArchivesModal: React.FC<NodeArchivesModalProps> = ({
  isOpen,
  onClose,
  nodeId,
  nodeName
}) => {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && nodeId) {
      loadArchives();
    }
  }, [isOpen, nodeId]);

  const loadArchives = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('node_archives')
        .select('*')
        .eq('node_id', nodeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArchives(data || []);
    } catch (error) {
      console.error('아카이브 로딩 실패:', error);
      toast.error('아카이브를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getArchiveTypeColor = (type: string) => {
    switch (type) {
      case 'conversation':
        return 'bg-blue-100 text-blue-800';
      case 'document':
        return 'bg-green-100 text-green-800';
      case 'note':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getArchiveTypeLabel = (type: string) => {
    switch (type) {
      case 'conversation':
        return 'AI 대화';
      case 'document':
        return '문서';
      case 'note':
        return '노트';
      default:
        return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {nodeName} - 아카이브 목록
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 text-center">
              아카이브를 불러오는 중...
            </div>
          ) : archives.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              아직 저장된 아카이브가 없습니다.
            </div>
          ) : (
            <div className="space-y-3 p-1">
              {archives.map((archive) => (
                <Card key={archive.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{archive.title}</h3>
                    <Badge 
                      variant="secondary"
                      className={getArchiveTypeColor(archive.archive_type)}
                    >
                      {getArchiveTypeLabel(archive.archive_type)}
                    </Badge>
                  </div>
                  
                  {archive.content_summary && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {archive.content_summary}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>
                      {formatDistanceToNow(new Date(archive.created_at), {
                        addSuffix: true,
                        locale: ko
                      })}
                    </span>
                    
                    {archive.conversation_id && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          // TODO: 대화 상세 보기 기능
                          toast.info('대화 상세 보기 기능은 곧 추가될 예정입니다.');
                        }}
                      >
                        상세보기
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>닫기</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};