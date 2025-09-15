import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, RotateCcw, Eye, EyeOff } from "lucide-react";
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

interface SubjectiveQuizProps {
  notes: WrongNote[];
  onComplete: () => void;
}

export function SubjectiveQuiz({ notes, onComplete }: SubjectiveQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [confidence, setConfidence] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setStartTime(new Date());
  }, [currentQuestionIndex]);

  const handleAnswerSubmit = () => {
    if (!userAnswer.trim()) return;
    setAnswered(true);
    setShowAnswer(true);
  };

  const handleConfidenceSelect = async (level: number) => {
    setConfidence(level);
    const isCorrect = level >= 4;
    
    if (isCorrect) {
      setScore(score + 1);
    }

    try {
      const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      
      await supabase.from("study_sessions").insert({
        wrong_note_id: currentQuestion.id,
        session_type: "quiz",
        score: isCorrect ? 100 : 0,
        confidence_level: level,
        time_spent: timeSpent,
        user_id: null
      });

      await supabase
        .from("memorization_checklist")
        .upsert({
          wrong_note_id: currentQuestion.id,
          is_memorized: isCorrect,
          confidence_level: level,
          last_reviewed_at: new Date().toISOString(),
          user_id: null
        }, {
          onConflict: "user_id,wrong_note_id"
        });

    } catch (error) {
      console.error("Error recording quiz result:", error);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < notes.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer("");
      setShowAnswer(false);
      setAnswered(false);
      setConfidence(null);
      setStartTime(new Date());
    } else {
      setQuizCompleted(true);
      recordFinalScore();
    }
  };

  const recordFinalScore = async () => {
    try {
      const finalScore = Math.round((score / notes.length) * 100);
      
      toast({
        title: "주관식 퀴즈 완료!",
        description: `점수: ${score}/${notes.length} (${finalScore}%)`,
      });

    } catch (error) {
      console.error("Error recording final score:", error);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setUserAnswer("");
    setShowAnswer(false);
    setAnswered(false);
    setScore(0);
    setQuizCompleted(false);
    setConfidence(null);
    setStartTime(new Date());
  };

  if (notes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p>퀴즈할 문제가 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  if (quizCompleted) {
    const finalScore = Math.round((score / notes.length) * 100);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">주관식 퀴즈 완료!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="text-6xl font-bold text-primary">
            {finalScore}%
          </div>
          <p className="text-xl">
            {score}개 정답 / 총 {notes.length}문제
          </p>
          
          <div className="space-y-2">
            {finalScore >= 90 && (
              <Badge variant="default" className="text-lg px-4 py-2">
                🎉 훌륭해요!
              </Badge>
            )}
            {finalScore >= 70 && finalScore < 90 && (
              <Badge variant="secondary" className="text-lg px-4 py-2">
                👍 잘했어요!
              </Badge>
            )}
            {finalScore < 70 && (
              <Badge variant="outline" className="text-lg px-4 py-2">
                💪 조금 더 복습해보세요!
              </Badge>
            )}
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={restartQuiz}>
              <RotateCcw className="h-4 w-4 mr-2" />
              다시 시도
            </Button>
            <Button variant="outline" onClick={onComplete}>
              완료
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = notes[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / notes.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="outline">
          문제 {currentQuestionIndex + 1} / {notes.length}
        </Badge>
        <Badge variant="secondary">
          점수: {score} / {currentQuestionIndex + (confidence !== null ? 1 : 0)}
        </Badge>
      </div>

      <Progress value={progress} className="w-full" />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">
              {currentQuestion.subject_name} &gt; {currentQuestion.book_name}
            </Badge>
          </div>
          <CardTitle className="text-lg whitespace-pre-wrap">{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <label className="text-sm font-medium">내 답안:</label>
            <Textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="답안을 작성해주세요..."
              disabled={answered}
              className="min-h-[100px]"
            />
          </div>

          {showAnswer && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-600 mb-2">📋 근거 원문</h4>
                <p className="text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
                  {currentQuestion.source_text}
                </p>
              </div>

              {currentQuestion.explanation && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-600 mb-2">설명</h4>
                  <p className="text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  내 답안이 얼마나 정확한가요?
                </p>
                <div className="flex justify-center gap-2">
                  {[
                    { label: "X", value: 1, desc: "틀림" },
                    { label: "△", value: 3, desc: "애매" },
                    { label: "O", value: 5, desc: "정답" }
                  ].map(({ label, value, desc }) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={confidence === value ? "default" : "outline"}
                      onClick={() => handleConfidenceSelect(value)}
                      className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                      <span className="text-lg font-bold">{label}</span>
                      <span className="text-xs">{desc}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <div></div>
            {!answered ? (
              <Button onClick={handleAnswerSubmit} disabled={!userAnswer.trim()}>
                정답 확인
              </Button>
            ) : confidence !== null ? (
              <Button onClick={nextQuestion}>
                {currentQuestionIndex < notes.length - 1 ? "다음 문제" : "결과 보기"}
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground">
                자신감 수준을 선택해주세요
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}