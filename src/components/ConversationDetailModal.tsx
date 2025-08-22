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
import { MessageSquare } from 'lucide-react';

// 단순화된 인터페이스
interface Conversation {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface ConversationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
}

export const ConversationDetailModal: React.FC<ConversationDetailModalProps> = ({
  isOpen,
  onClose,
  conversationId
}) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && conversationId) {
      loadConversation();
    }
  }, [isOpen, conversationId]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      console.log('📋 대화 조회 시작:', conversationId);

      // 단순한 SELECT 쿼리만 사용
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('❌ 조회 오류:', error);
        if (error.code === 'PGRST116') {
          throw new Error('해당 대화를 찾을 수 없습니다.');
        }
        throw error;
      }

      console.log('✅ 조회 성공:', data);
      setConversation(data);
      
    } catch (error) {
      console.error('💥 조회 실패:', error);
      toast.error('대화를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare size={20} />
            대화 상세보기
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="p-8 text-center">
            대화를 불러오는 중...
          </div>
        ) : !conversation ? (
          <div className="p-8 text-center text-muted-foreground">
            대화를 찾을 수 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">{conversation.title}</h2>
              <Badge variant="outline">
                {formatDistanceToNow(new Date(conversation.created_at), {
                  addSuffix: true,
                  locale: ko
                })}
              </Badge>
            </div>
            
            <ScrollArea className="h-[60vh]">
              <Card className="p-6">
                <div className="whitespace-pre-wrap leading-relaxed">
                  {conversation.content}
                </div>
              </Card>
            </ScrollArea>
          </div>
        )}
        
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>닫기</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};