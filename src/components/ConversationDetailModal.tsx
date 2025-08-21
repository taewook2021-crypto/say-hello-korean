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
import { MessageSquare, ChevronDown, ChevronUp, FileText, HelpCircle } from 'lucide-react';

interface QAPair {
  id: string;
  q_text: string;
  a_text: string;
  difficulty: string;
  importance: string;
  tags: string[];
}

interface Summary {
  id: string;
  title: string;
  content: string;
  structure_type: string;
}

interface Conversation {
  id: string;
  subject: string;
  raw_text: string;
  created_at: string;
  qa_pairs: QAPair[];
  summaries: Summary[];
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
          qa_pairs (*),
          summaries (*)
        `)
        .eq('id', conversationId)
        .maybeSingle();

      if (error) {
        console.error('대화 조회 오류:', error);
        throw error;
      }
      
      if (!data) {
        console.log('대화를 찾을 수 없음:', conversationId);
        setConversation(null);
        return;
      }
      
      // 데이터 구조 정리
      const conversation: Conversation = {
        id: data.id,
        subject: data.subject,
        raw_text: data.raw_text,
        created_at: data.created_at,
        qa_pairs: data.qa_pairs || [],
        summaries: Array.isArray(data.summaries) ? data.summaries : []
      };
      
      setConversation(conversation);
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
      <DialogContent className="sm:max-w-7xl max-h-[90vh] w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare size={20} />
            대화 상세보기 - {conversation?.subject}
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
          <div className="flex gap-6 h-[70vh]">
            {/* 좌측: 정리글 */}
            <div className="w-1/2 border-r pr-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">📝 학습 정리</h3>
                <Badge variant="outline">
                  {formatDistanceToNow(new Date(conversation.created_at), {
                    addSuffix: true,
                    locale: ko
                  })}
                </Badge>
              </div>
              
              <ScrollArea className="h-full">
                {conversation.summaries && conversation.summaries.length > 0 ? (
                  <div className="space-y-4">
                    {conversation.summaries.map((summary) => (
                      <Card key={summary.id} className="p-4">
                        <h4 className="font-medium mb-3">{summary.title}</h4>
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {summary.content}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-6 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">저장된 정리글이 없습니다</p>
                    <p className="text-sm mt-2">Q&A 카드만 생성된 대화이거나 데이터가 없습니다.</p>
                  </Card>
                )}
              </ScrollArea>
            </div>

            {/* 우측: Q&A 카드들 */}
            <div className="w-1/2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">🎯 Q&A 카드</h3>
                {conversation.qa_pairs.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={toggleAllAnswers}
                  >
                    {showAnswers.size === conversation.qa_pairs.length ? '모두 숨기기' : '모두 보기'}
                  </Button>
                )}
              </div>

              <ScrollArea className="h-full">
                {conversation.qa_pairs.length > 0 ? (
                  <div className="space-y-3">
                    {conversation.qa_pairs.map((qa, index) => (
                      <Card key={qa.id} className="p-4 hover:shadow-md transition-shadow">
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
                              <p className="font-medium text-sm leading-relaxed">{qa.q_text}</p>
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
                            <div className="border-l-4 border-primary/20 pl-4 ml-2 bg-muted/30 p-3 rounded-r">
                              <div className="text-xs text-muted-foreground mb-1">💡 답변:</div>
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
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-6 text-center text-muted-foreground">
                    <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">저장된 Q&A 카드가 없습니다</p>
                    <p className="text-sm mt-2">정리글만 생성된 대화이거나 데이터가 없습니다.</p>
                  </Card>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
        
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>닫기</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};