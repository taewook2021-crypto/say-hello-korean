import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, RotateCcw, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WrongNote {
  id: string;
  question: string;
  source_text: string;
  explanation: string | null;
  subject_name: string;
  book_name: string;
  chapter_name: string;
  is_resolved: boolean;
}

interface FlashCardProps {
  notes: WrongNote[];
  onComplete: () => void;
}

export function FlashCard({ notes, onComplete }: FlashCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const { toast } = useToast();

  const currentNote = notes[currentIndex];

  const nextCard = () => {
    if (currentIndex < notes.length - 1) {
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
      // 학습 세션 기록
      await supabase.from("study_sessions").insert({
        wrong_note_id: currentNote.id,
        session_type: "flashcard",
        confidence_level: level,
        time_spent: 30, // 기본 30초로 설정
        user_id: null // RLS가 있어서 자동으로 설정됨
      });

      // 복습 스케줄 업데이트
      const { data: existingSchedule } = await supabase
        .from("review_schedule")
        .select("*")
        .eq("wrong_note_id", currentNote.id)
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
          wrong_note_id: currentNote.id,
          review_count: 1,
          next_review_date: nextReviewDate.toISOString(),
          interval_days: level >= 4 ? 3 : 1,
          ease_factor: level >= 4 ? 2.6 : 2.3,
          user_id: null // RLS가 있어서 자동으로 설정됨
        });
      }

      // 암기 체크리스트 업데이트
      await supabase
        .from("memorization_checklist")
        .upsert({
          wrong_note_id: currentNote.id,
          is_memorized: level >= 4,
          confidence_level: level,
          last_reviewed_at: new Date().toISOString(),
          user_id: null // RLS가 있어서 자동으로 설정됨
        }, {
          onConflict: "user_id,wrong_note_id"
        });

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

  if (!currentNote) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {currentIndex + 1} / {notes.length}
          </Badge>
        <Badge variant="secondary">
          {currentNote.subject_name} &gt; {currentNote.book_name} &gt; {currentNote.chapter_name}
        </Badge>
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
                <p className="text-xl leading-relaxed whitespace-pre-wrap">{currentNote.question}</p>
                <p className="text-sm text-muted-foreground mt-8">
                  클릭하여 정답 확인
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 뒷면 - 해설 */}
          <Card className={`absolute inset-0 backface-hidden rotate-y-180 ${isFlipped ? "opacity-100" : "opacity-0"}`}>
            <CardContent className="p-8 h-full flex flex-col justify-between">
              <div className="space-y-6 flex-1">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-blue-600 mb-4">정답 / 해설</h3>
                  <p className="text-xl leading-relaxed whitespace-pre-wrap">
                    {currentNote.explanation || currentNote.source_text || "해설이 없습니다."}
                  </p>
                </div>
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

        {currentIndex === notes.length - 1 ? (
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