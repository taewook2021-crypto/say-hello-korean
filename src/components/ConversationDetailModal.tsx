import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

interface QAPair {
  id: string;
  q_text: string;
  a_text: string;
  difficulty: string;
  importance: string;
  tags: string[];
}

interface Conversation {
  id: string;
  subject: string;
  raw_text: string;
  created_at: string;
  qa_pairs: QAPair[];
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
  const [showAnswers, setShowAnswers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && conversationId) {
      loadConversation();
    }
  }, [isOpen, conversationId]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          qa_pairs (*)
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      setConversation(data);
    } catch (error) {
      console.error('대화 로딩 실패:', error);
      toast.error('대화를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAnswer = (qaId: string) => {
    const newShowAnswers = new Set(showAnswers);
    if (newShowAnswers.has(qaId)) {
      newShowAnswers.delete(qaId);
    } else {
      newShowAnswers.add(qaId);
    }
    setShowAnswers(newShowAnswers);
  };

  const toggleAllAnswers = () => {
    if (!conversation) return;
    
    if (showAnswers.size === conversation.qa_pairs.length) {
      // 모두 보이고 있으면 모두 숨기기
      setShowAnswers(new Set());
    } else {
      // 일부만 보이거나 모두 숨겨져 있으면 모두 보이기
      setShowAnswers(new Set(conversation.qa_pairs.map(qa => qa.id)));
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-purple-100 text-purple-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare size={20} />
            대화 상세보기
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 text-center">
              대화를 불러오는 중...
            </div>
          ) : !conversation ? (
            <div className="p-4 text-center text-muted-foreground">
              대화를 찾을 수 없습니다.
            </div>
          ) : (
            <div className="space-y-4 p-1">
              {/* 대화 정보 */}
              <Card className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{conversation.subject}</h3>
                  <Badge variant="outline">
                    {formatDistanceToNow(new Date(conversation.created_at), {
                      addSuffix: true,
                      locale: ko
                    })}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {conversation.qa_pairs.length}개의 Q&A 쌍
                </p>
              </Card>

              {/* Q&A 목록 */}
              {conversation.qa_pairs.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">질문과 답변</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleAllAnswers}
                    >
                      {showAnswers.size === conversation.qa_pairs.length ? '모두 숨기기' : '모두 보기'}
                    </Button>
                  </div>

                  {conversation.qa_pairs.map((qa, index) => (
                    <Card key={qa.id} className="p-4">
                      <div className="space-y-3">
                        {/* 질문 */}
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">Q{index + 1}</Badge>
                              <Badge 
                                variant="secondary"
                                className={getDifficultyColor(qa.difficulty)}
                              >
                                {qa.difficulty}
                              </Badge>
                              <Badge 
                                variant="secondary"
                                className={getImportanceColor(qa.importance)}
                              >
                                {qa.importance}
                              </Badge>
                            </div>
                            <p className="font-medium">{qa.q_text}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAnswer(qa.id)}
                          >
                            {showAnswers.has(qa.id) ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </Button>
                        </div>

                        {/* 답변 */}
                        {showAnswers.has(qa.id) && (
                          <div className="border-l-4 border-primary/20 pl-4 ml-2">
                            <div className="text-sm text-muted-foreground mb-1">답변:</div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {qa.a_text}
                            </p>
                          </div>
                        )}

                        {/* 태그 */}
                        {qa.tags && qa.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {qa.tags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* 원본 텍스트 */}
              <Card className="p-4">
                <h4 className="font-medium mb-2">원본 텍스트</h4>
                <ScrollArea className="max-h-40 bg-muted/50 p-3 rounded border">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {conversation.raw_text}
                  </pre>
                </ScrollArea>
              </Card>
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