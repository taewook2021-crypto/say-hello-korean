import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, RotateCcw, Check, Brain, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { updateCardAfterReview } from "@/utils/srsAlgorithm";

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

interface AICard {
  id: string;
  front: string;
  back: string;
  next_review_date: string;
  ease_factor: number;
  interval_days: number;
  reviewed_count: number;
  qa_pairs: {
    q_text: string;
    a_text: string;
    tags: string[];
    difficulty: string;
    conversations: {
      subject: string;
    };
  };
}

interface FlashCardProps {
  notes: WrongNote[];
  aiCards?: AICard[];
  onComplete: () => void;
}

export function FlashCard({ notes, aiCards = [], onComplete }: FlashCardProps) {
  // 모든 카드 통합 (기존 오답노트 + AI 카드)
  const allItems = [
    ...notes.map(note => ({ type: 'wrong_note' as const, data: note })),
    ...aiCards.map(card => ({ type: 'ai_card' as const, data: card }))
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const { toast } = useToast();

  const currentItem = allItems[currentIndex];
  const isAICard = currentItem?.type === 'ai_card';

  const nextCard = () => {
    if (currentIndex < allItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setConfidence(null);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setConfidence(null);
    }
  };

  const handleConfidenceSelect = async (level: number) => {
    setConfidence(level);
    
    try {
      if (isAICard) {
        const aiCard = currentItem.data as AICard;
        
        // AI 카드 학습 세션 기록
        await supabase.from("study_sessions").insert({
          wrong_note_id: null, // AI 카드는 wrong_note_id가 없음
          session_type: "flashcard",
          confidence_level: level,
          time_spent: 30,
        });

        // AI 카드 업데이트 (SRS 알고리즘 적용)
        const updateData = updateCardAfterReview(aiCard.id, level, {
          ease_factor: aiCard.ease_factor,
          interval_days: aiCard.interval_days,
          reviewed_count: aiCard.reviewed_count
        });

        await supabase
          .from("cards")
          .update(updateData)
          .eq("id", aiCard.id);

      } else {
        const wrongNote = currentItem.data as WrongNote;
        
        // 기존 오답노트 처리 (기존 로직 유지)
        await supabase.from("study_sessions").insert({
          wrong_note_id: wrongNote.id,
          session_type: "flashcard",
          confidence_level: level,
          time_spent: 30,
        });

        // 복습 스케줄 업데이트
        const { data: existingSchedule } = await supabase
          .from("review_schedule")
          .select("*")
          .eq("wrong_note_id", wrongNote.id)
          .maybeSingle();

        if (existingSchedule) {
          const newInterval = level >= 4 ? existingSchedule.interval_days * 2 : Math.max(1, existingSchedule.interval_days - 1);
          const nextReviewDate = new Date();
          nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

          await supabase
            .from("review_schedule")
            .update({
              review_count: existingSchedule.review_count + 1,
              next_review_date: nextReviewDate.toISOString(),
              interval_days: newInterval,
              ease_factor: level >= 4 ? Math.min(3.0, existingSchedule.ease_factor + 0.1) : Math.max(1.3, existingSchedule.ease_factor - 0.2)
            })
            .eq("id", existingSchedule.id);
        } else {
          const nextReviewDate = new Date();
          nextReviewDate.setDate(nextReviewDate.getDate() + (level >= 4 ? 3 : 1));

          await supabase.from("review_schedule").insert({
            wrong_note_id: wrongNote.id,
            review_count: 1,
            next_review_date: nextReviewDate.toISOString(),
            interval_days: level >= 4 ? 3 : 1,
            ease_factor: level >= 4 ? 2.6 : 2.3,
          });
        }

        // 암기 체크리스트 업데이트
        await supabase
          .from("memorization_checklist")
          .upsert({
            wrong_note_id: wrongNote.id,
            is_memorized: level >= 4,
            confidence_level: level,
            last_reviewed_at: new Date().toISOString(),
          }, {
            onConflict: "user_id,wrong_note_id"
          });
      }

      toast({
        title: "학습 기록 저장됨",
        description: `자신감 수준 ${level}/5로 기록되었습니다.`,
      });

    } catch (error) {
      console.error("Error recording study session:", error);
      toast({
        title: "오류",
        description: "학습 기록 저장에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const resetCard = () => {
    setIsFlipped(false);
    setConfidence(null);
  };

  if (!currentItem) return null;

  // 현재 아이템에 따른 데이터 추출
  const getItemData = () => {
    if (isAICard) {
      const aiCard = currentItem.data as AICard;
      return {
        question: aiCard.front,
        answer: aiCard.back,
        subject: aiCard.qa_pairs.conversations.subject,
        book: null,
        chapter: null,
        wrongAnswer: null,
        explanation: null,
        tags: aiCard.qa_pairs.tags,
        difficulty: aiCard.qa_pairs.difficulty
      };
    } else {
      const wrongNote = currentItem.data as WrongNote;
      return {
        question: wrongNote.question,
        answer: wrongNote.correct_answer,
        subject: wrongNote.subject_name,
        book: wrongNote.book_name,
        chapter: wrongNote.chapter_name,
        wrongAnswer: wrongNote.wrong_answer,
        explanation: wrongNote.explanation,
        tags: [],
        difficulty: null
      };
    }
  };

  const itemData = getItemData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {currentIndex + 1} / {allItems.length}
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            {isAICard && <Brain className="h-3 w-3" />}
            {itemData.subject}
            {itemData.book && itemData.chapter && (
              <> &gt; {itemData.book} &gt; {itemData.chapter}</>
            )}
          </Badge>
          {isAICard && itemData.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {itemData.tags.slice(0, 2).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={resetCard}>
          <RotateCcw className="h-4 w-4 mr-2" />
          초기화
        </Button>
      </div>

      <div className="perspective-1000 h-[500px]">
        <div 
          className={`relative w-full h-full cursor-pointer transition-transform duration-700 preserve-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* 앞면 - 문제 */}
          <Card className={`absolute inset-0 backface-hidden ${isFlipped ? "opacity-0" : "opacity-100"}`}>
            <CardContent className="p-8 h-full flex flex-col justify-center">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-medium text-primary mb-4">문제</h3>
                <p className="text-xl leading-relaxed whitespace-pre-wrap">{itemData.question}</p>
                <p className="text-sm text-muted-foreground mt-8">
                  클릭하여 정답 확인
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 뒷면 - 정답 */}
          <Card className={`absolute inset-0 backface-hidden rotate-y-180 ${isFlipped ? "opacity-100" : "opacity-0"}`}>
            <CardContent className="p-8 h-full flex flex-col justify-between">
              <div className="space-y-6 flex-1">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-green-600 mb-4">정답</h3>
                  <p className="text-xl leading-relaxed mb-6 whitespace-pre-wrap">{itemData.answer}</p>
                </div>

                {itemData.wrongAnswer && (
                  <div className="bg-destructive/10 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-destructive mb-2">내가 틀린 답</h4>
                    <p className="text-destructive/80 whitespace-pre-wrap">{itemData.wrongAnswer}</p>
                  </div>
                )}

                {itemData.explanation && (
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-primary mb-2">설명</h4>
                    <p className="text-primary/80 whitespace-pre-wrap">{itemData.explanation}</p>
                  </div>
                )}

                {isAICard && itemData.difficulty && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-600 mb-2">난이도</h4>
                    <Badge className="text-xs">
                      {itemData.difficulty === 'basic' ? '기초' : 
                       itemData.difficulty === 'intermediate' ? '중급' : '고급'}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground mb-4">이 문제를 얼마나 잘 기억하고 있나요?</p>
                <div className="flex justify-center gap-2">
                  {[
                    { label: "X", value: 1, desc: "모름" },
                    { label: "△", value: 3, desc: "애매" },
                    { label: "O", value: 5, desc: "확실" }
                  ].map(({ label, value, desc }) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={confidence === value ? "default" : "outline"}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfidenceSelect(value);
                      }}
                      className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                      <span className="text-lg font-bold">{label}</span>
                      <span className="text-xs">{desc}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={prevCard}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          이전
        </Button>

        {confidence !== null && (
          <Badge variant="default" className="flex items-center gap-2">
            <Check className="h-3 w-3" />
            자신감: {confidence === 1 ? "X" : confidence === 3 ? "△" : "O"}
          </Badge>
        )}

        {currentIndex === allItems.length - 1 ? (
          <Button
            variant="default"
            onClick={onComplete}
          >
            <Check className="h-4 w-4 mr-2" />
            종료
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={nextCard}
          >
            다음
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}