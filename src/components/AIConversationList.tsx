import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

// 단순화된 인터페이스
interface Conversation {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface AIConversationListProps {
  refreshTrigger?: number;
  onConversationClick?: (conversationId: string) => void;
}

export const AIConversationList: React.FC<AIConversationListProps> = ({ refreshTrigger, onConversationClick }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConversations();
  }, [refreshTrigger]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      console.log('📋 대화 목록 조회 시작');

      // 단순한 SELECT 쿼리만 사용
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ 조회 오류:', error);
        throw error;
      }

      console.log('✅ 조회 성공:', data?.length || 0, '개의 대화');
      setConversations(data || []);
      
    } catch (error) {
      console.error('💥 조회 실패:', error);
      toast({
        title: "오류",
        description: "대화 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            대화 목록을 불러오는 중...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            저장된 대화가 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">최근 대화</h3>
      {conversations.map((conversation) => (
        <Card key={conversation.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare size={16} />
                {conversation.title}
              </CardTitle>
              <Badge variant="outline">
                {formatDistanceToNow(new Date(conversation.created_at), {
                  addSuffix: true,
                  locale: ko
                })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {conversation.content.substring(0, 100)}
                {conversation.content.length > 100 ? '...' : ''}
              </p>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onConversationClick?.(conversation.id)}
                >
                  <Eye size={14} className="mr-1" />
                  자세히 보기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};