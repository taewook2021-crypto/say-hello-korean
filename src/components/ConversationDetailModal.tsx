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
import { MessageSquare, ChevronDown, ChevronUp, FileText, HelpCircle, BookOpen, FileDown, Brain } from 'lucide-react';
import { parseAROFormat, ParsedConversation } from '@/utils/aroParser';
import { convertArchiveToWrongNotes, validateArchiveQAs, convertArchiveToNotesFormat } from '@/utils/archiveConverter';

// 컴포넌트에서 사용할 WrongNote 타입 정의
interface WrongNote {
  id: string;
  question: string;
  wrong_answer: string | null;
  correct_answer: string;
  explanation: string | null;
  subject_name: string;
  book_name: string;
  chapter_name: string;
  is_resolved: boolean;
}
import { FlashCard } from '@/components/study/FlashCard';
import { Quiz } from '@/components/study/Quiz';
import { SubjectiveQuiz } from '@/components/study/SubjectiveQuiz';
import { StudyModeSelector } from '@/components/study/StudyModeSelector';
import { downloadPDF, printPDF } from '@/components/pdf-generator';

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
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [selectedStudyMode, setSelectedStudyMode] = useState<'flashcard' | 'quiz' | 'subjective' | null>(null);

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

  const handleStudyStart = (mode: 'flashcard' | 'quiz' | 'subjective') => {
    if (!parsedData || parsedData.qaPairs.length === 0) {
      toast.error('학습할 Q&A가 없습니다.');
      return;
    }
    setSelectedStudyMode(mode);
    setShowStudyModal(true);
  };

  const handleStudyComplete = () => {
    setShowStudyModal(false);
    setSelectedStudyMode(null);
    toast.success('학습을 완료했습니다!');
  };

  const handleDownloadPDF = async () => {
    if (!parsedData || parsedData.qaPairs.length === 0) {
      toast.error('다운로드할 Q&A가 없습니다.');
      return;
    }

    const wrongNotes = convertArchiveToWrongNotes(
      parsedData.qaPairs,
      conversation?.title || '아카이브',
      conversationId
    );

    await downloadPDF(wrongNotes, '아카이브', conversation?.title || '저장된 Q&A', 'Q&A 복습', {
      includeWrongAnswers: false,
      paperTemplate: 'default'
    });
  };

  const getConvertedNotes = () => {
    if (!parsedData || !conversation) return [];
    return convertArchiveToWrongNotes(
      parsedData.qaPairs,
      conversation.title,
      conversationId
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] w-[95vw]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare size={20} />
              대화 상세보기
            </DialogTitle>
            
            {parsedData && parsedData.qaPairs.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowStudyModal(true)}
                  size="sm"
                  variant="outline"
                >
                  <Brain size={16} className="mr-1" />
                  복습하기
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  size="sm"
                  variant="outline"
                >
                  <FileDown size={16} className="mr-1" />
                  PDF 다운로드
                </Button>
              </div>
            )}
          </div>
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
          <div className="flex gap-6">
            {/* 좌측: 정리글 박스 */}
            <div className="w-1/2">
              <div className="bg-card border rounded-lg shadow-sm h-[400px] p-4 flex flex-col">
                <div className="mb-4 flex-shrink-0">
                  <h3 className="text-lg font-semibold mb-2">📝 학습 정리</h3>
                  <Badge variant="outline">
                    {formatDistanceToNow(new Date(conversation.created_at), {
                      addSuffix: true,
                      locale: ko
                    })}
                  </Badge>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {parsedData?.summary ? (
                    <div className="p-4 bg-muted/50 rounded-md">
                      <h4 className="font-medium mb-3">{parsedData.summary.title}</h4>
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {parsedData.summary.content}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/50 rounded-md">
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {conversation.content}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 우측: Q&A 카드 박스 */}
            <div className="w-1/2">
              <div className="bg-card border rounded-lg shadow-sm h-[400px] p-4 flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
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

                <div className="flex-1 overflow-y-auto">
                  {parsedData && parsedData.qaPairs.length > 0 ? (
                    <div className="space-y-3 pr-2">
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
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-muted-foreground p-6">
                        <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Q&A 카드가 없습니다</p>
                        <p className="text-sm mt-2">좌측 정리글만 저장된 대화입니다.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>닫기</Button>
        </div>

        {/* 학습 모드 선택 모달 */}
        <Dialog open={showStudyModal} onOpenChange={setShowStudyModal}>
          <DialogContent>
            {!selectedStudyMode ? (
              <StudyModeSelector
                noteCount={parsedData?.qaPairs.length || 0}
                onModeSelect={(mode) => {
                  if (mode === 'multiple-choice') {
                    handleStudyStart('quiz');
                  } else {
                    handleStudyStart(mode);
                  }
                }}
              />
            ) : (
              <>
                {selectedStudyMode === 'flashcard' && (
                  <FlashCard
                    notes={getConvertedNotes()}
                    onComplete={handleStudyComplete}
                  />
                )}
                {selectedStudyMode === 'quiz' && (
                  <Quiz
                    notes={getConvertedNotes()}
                    onComplete={handleStudyComplete}
                  />
                )}
                {selectedStudyMode === 'subjective' && (
                  <SubjectiveQuiz
                    notes={getConvertedNotes()}
                    onComplete={handleStudyComplete}
                  />
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};