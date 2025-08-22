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
      console.log('🚀 === ConversationDetailModal 열림 ===');
      console.log('📋 props - conversationId:', conversationId);
      console.log('🔍 conversationId 타입:', typeof conversationId);
      console.log('✅ props - isOpen:', isOpen);
      
      // 임시 테스트용으로 하드코딩된 ID 사용
      const testConversationId = 'c7efb1f5-39c8-4a83-ad41-82f26ec024bd';
      console.log('🧪 테스트용 conversation ID:', testConversationId);
      
      loadConversation(testConversationId);
    }
  }, [isOpen, conversationId]);

  const loadConversation = async (testId?: string) => {
    const actualId = testId || conversationId;
    console.log('📋 사용할 conversation ID:', actualId);
    console.log('🌐 현재 환경:', {
      url: window.location.href,
      isIframe: window.parent !== window,
      userAgent: navigator.userAgent.substring(0, 50)
    });
    
    setLoading(true);
    try {
      // 현재 사용자 정보 확인 (임시로 고정값 사용)
      const mockUserId = 'ebcc4eaf-7b16-4a2b-b3ab-4105ba5ff92c';
      console.log('👤 현재 사용자 ID (임시):', mockUserId);

      // 먼저 node_archives에서 해당 conversation_id가 있는지 확인
      console.log('1. node_archives에서 conversation 확인...');
      const { data: archiveData, error: archiveError } = await supabase
        .from('node_archives')
        .select('*')
        .eq('conversation_id', actualId);

      if (archiveError) {
        console.error('아카이브 조회 오류:', archiveError);
      } else {
        console.log('아카이브 데이터:', archiveData);
      }

      // 2️⃣ 관련 테이블 데이터 확인
      console.log('2️⃣ 관련 테이블 데이터 확인...');
      
      // summaries 개별 조회
      console.log('📄 summaries 조회...');
      const summariesCheck = await supabase
        .from('summaries')
        .select('*')
        .eq('conversation_id', actualId);
      
      console.log('summaries 결과:', summariesCheck);
      
      // qa_pairs 개별 조회  
      console.log('💭 qa_pairs 조회...');
      const qaPairsCheck = await supabase
        .from('qa_pairs')
        .select('*')
        .eq('conversation_id', actualId);
        
      console.log('qa_pairs 결과:', qaPairsCheck);

      // 3️⃣ JOIN 쿼리 실행
      console.log('3️⃣ 전체 JOIN 쿼리 실행...');
      const joinQuery = `
        SELECT 
          conversations.*,
          COALESCE(
            JSON_AGG(
              CASE WHEN qa_pairs.id IS NOT NULL 
              THEN json_build_object(
                'id', qa_pairs.id,
                'q_text', qa_pairs.q_text,
                'a_text', qa_pairs.a_text,
                'difficulty', qa_pairs.difficulty,
                'importance', qa_pairs.importance,
                'tags', qa_pairs.tags
              ) END
            ) FILTER (WHERE qa_pairs.id IS NOT NULL), 
            '[]'::json
          ) as qa_pairs,
          COALESCE(
            JSON_AGG(
              CASE WHEN summaries.id IS NOT NULL 
              THEN json_build_object(
                'id', summaries.id,
                'title', summaries.title,
                'content', summaries.content,
                'structure_type', summaries.structure_type
              ) END
            ) FILTER (WHERE summaries.id IS NOT NULL), 
            '[]'::json
          ) as summaries
        FROM conversations
        LEFT JOIN qa_pairs ON conversations.id = qa_pairs.conversation_id
        LEFT JOIN summaries ON conversations.id = summaries.conversation_id
        WHERE conversations.id = '${actualId}'
        GROUP BY conversations.id
      `;
      
      console.log('실행할 쿼리:', joinQuery);

      // 4️⃣ 최종 조회 (기존 방식)
      console.log('4️⃣ 기존 JOIN 방식으로 최종 조회...');
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          qa_pairs (*),
          summaries (*)
        `)
        .eq('id', actualId)
        .maybeSingle();

      console.log('🎯 최종 조회 결과:', { data, error });

      if (error) {
        console.error('💥 최종 조회 오류:', error);
        if (error.code === 'PGRST116') {
          console.log('🔍 오류 원인: 해당 ID의 대화를 찾을 수 없음');
          throw new Error('해당 대화를 찾을 수 없습니다.');
        }
        throw new Error(`데이터베이스 오류: ${error.message}`);
      }
      
      if (!data) {
        console.log('💥 데이터 없음 - conversation_id가 존재하지 않거나 접근 권한이 없음');
        throw new Error('대화 데이터를 찾을 수 없습니다.');
      }

      console.log('🎉 === 대화 데이터 조회 성공 ===');
      console.log('📊 데이터 분석:');
      console.log('- 대화 제목:', data.subject);
      console.log('- 정리글 개수:', data.summaries?.length || 0);
      console.log('- Q&A 개수:', data.qa_pairs?.length || 0);
      console.log('- 원본 텍스트 길이:', data.raw_text?.length || 0);
      
      // 데이터 구조 정리
      const conversation: Conversation = {
        id: data.id,
        subject: data.subject,
        raw_text: data.raw_text,
        created_at: data.created_at,
        qa_pairs: Array.isArray(data.qa_pairs) ? data.qa_pairs : [],
        summaries: Array.isArray(data.summaries) ? data.summaries : []
      };
      
      console.log('🚀 최종 conversation 객체:', conversation);
      console.log('✅ === 대화 불러오기 성공적으로 완료 ===');
      setConversation(conversation);
    } catch (error) {
      console.error('💥 === 대화 로딩 실패 ===');
      console.error('원본 오류:', error);
      console.error('오류 타입:', typeof error);
      console.error('오류 코드:', error?.code);
      console.error('오류 메시지:', error?.message);
      console.error('오류 스택:', error?.stack);
      
      let errorMessage = '대화를 불러오는데 실패했습니다.';
      
      // iframe 환경에서는 특별한 안내 추가
      const isIframe = window.parent !== window;
      
      if (error?.code === 'PGRST116') {
        errorMessage = '해당 대화를 찾을 수 없습니다.';
      } else if (error?.code === 'PGRST301') {
        errorMessage = '대화에 접근할 권한이 없습니다.';
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
        if (isIframe) {
          errorMessage += ' iframe 환경에서는 일부 요청이 차단될 수 있습니다.';
        }
      } else if (error?.message?.includes('CORS')) {
        errorMessage = 'CORS 오류가 발생했습니다.';
        if (isIframe) {
          errorMessage += ' iframe 환경에서는 외부 요청이 제한될 수 있습니다.';
        }
      }
      
      if (isIframe && !errorMessage.includes('iframe')) {
        errorMessage += ' iframe 제한으로 인한 문제일 수 있습니다. 새 탭에서 시도해보세요.';
      }
      
      console.log('🎯 사용자에게 표시할 오류:', errorMessage);
      toast.error(errorMessage, {
        duration: 5000,
        action: isIframe ? {
          label: '새 탭에서 열기',
          onClick: () => window.open(window.location.href, '_blank')
        } : undefined
      });
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