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
import { MessageSquare, ChevronDown, ChevronUp, FileText, HelpCircle } from 'lucide-react';
import { parseAROFormat, ParsedConversation } from '@/utils/aroParser';

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
  const [parsedData, setParsedData] = useState<ParsedConversation | null>(null);
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
      
      // content 파싱하여 좌우 분할 준비
      const parsed = parseAROFormat(data.content);
      console.log('📋 파싱 결과:', parsed);
      setParsedData(parsed);
      
    } catch (error) {
      console.error('💥 조회 실패:', error);
      toast.error('대화를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAnswer = (qaIndex: number) => {
    const newShowAnswers = new Set(showAnswers);
    if (newShowAnswers.has(qaIndex.toString())) {
      newShowAnswers.delete(qaIndex.toString());
    } else {
      newShowAnswers.add(qaIndex.toString());
    }
    setShowAnswers(newShowAnswers);
  };

  const toggleAllAnswers = () => {
    if (!parsedData) return;
    
    if (showAnswers.size === parsedData.qaPairs.length) {
      setShowAnswers(new Set());
    } else {
      setShowAnswers(new Set(parsedData.qaPairs.map((_, index) => index.toString())));
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] w-[95vw]">
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
                {parsedData?.summary ? (
                  <Card className="p-4">
                    <h4 className="font-medium mb-3">{parsedData.summary.title}</h4>
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {parsedData.summary.content}
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-4">
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {conversation.content}
                    </div>
                  </Card>
                )}
              </ScrollArea>
            </div>

            {/* 우측: Q&A 카드들 */}
            <div className="w-1/2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">🎯 Q&A 카드</h3>
                {parsedData && parsedData.qaPairs.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={toggleAllAnswers}
                  >
                    {showAnswers.size === parsedData.qaPairs.length ? '모두 숨기기' : '모두 보기'}
                  </Button>
                )}
              </div>

              <ScrollArea className="h-full">
                {parsedData && parsedData.qaPairs.length > 0 ? (
                  <div className="space-y-3">
                    {parsedData.qaPairs.map((qa, index) => (
                      <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                        <div className="space-y-3">
                          {/* 질문 */}
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary">Q{index + 1}</Badge>
                                <Badge 
                                  variant="secondary"
                                  className={getDifficultyColor(qa.level)}
                                >
                                  {qa.level}
                                </Badge>
                              </div>
                              <p className="font-medium text-sm leading-relaxed">{qa.question}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleAnswer(index)}
                            >
                              {showAnswers.has(index.toString()) ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </Button>
                          </div>

                          {/* 답변 */}
                          {showAnswers.has(index.toString()) && (
                            <div className="border-l-4 border-primary/20 pl-4 ml-2 bg-muted/30 p-3 rounded-r">
                              <div className="text-xs text-muted-foreground mb-1">💡 답변:</div>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {qa.answer}
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
                    <p className="font-medium">Q&A 카드가 없습니다</p>
                    <p className="text-sm mt-2">좌측 정리글만 저장된 대화입니다.</p>
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