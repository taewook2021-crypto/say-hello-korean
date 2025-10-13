import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HtmlContent } from "@/components/ui/html-content";

interface WrongNote {
  id: string;
  question: string;
  source_text: string;
  explanation: string | null;
  subject_name: string;
  book_name: string;
  chapter_name: string;
  is_resolved: boolean;
  multiple_choice_options?: Array<{
    text: string;
    is_correct: boolean;
  }>;
  quiz_config?: {
    answer_type: 'single' | 'multiple';
    instruction?: string;
  };
}

interface QuizProps {
  notes: WrongNote[];
  onComplete: () => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswers: string[];
  answerType: 'single' | 'multiple';
  instruction?: string;
  explanation: string | null;
  originalNote: WrongNote;
}

export function Quiz({ notes, onComplete }: QuizProps) {
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    generateQuizQuestions();
    setStartTime(new Date());
  }, [notes]);

  const generateQuizQuestions = () => {
    const questions: QuizQuestion[] = notes.map(note => {
      // Check if note has user-defined multiple choice options
      if (note.multiple_choice_options && Array.isArray(note.multiple_choice_options)) {
        // Get all correct answers
        const correctAnswers = note.multiple_choice_options
          .filter(opt => opt.is_correct)
          .map(opt => opt.text);
        
        // Use user-defined options
        const options = note.multiple_choice_options.map(opt => opt.text);
        const shuffledOptions = options.sort(() => Math.random() - 0.5);
        
        // Determine answer type from quiz_config or infer from correct answers count
        const answerType = note.quiz_config?.answer_type || 
          (correctAnswers.length > 1 ? 'multiple' : 'single');
        
        return {
          id: note.id,
          question: note.question,
          options: shuffledOptions,
          correctAnswers,
          answerType,
          instruction: note.quiz_config?.instruction,
          explanation: note.explanation,
          originalNote: note
        };
      }
      
      // Fallback to automatic generation for backward compatibility
      const options = [note.source_text];
      
      // 다른 노트들에서 오답 선택지 생성
      const otherAnswers = notes
        .filter(n => n.id !== note.id && n.source_text !== note.source_text)
        .map(n => n.source_text)
        .slice(0, 3);
      
      options.push(...otherAnswers);
      
      // 부족한 선택지는 일반적인 오답으로 채움
      while (options.length < 4) {
        const dummyAnswers = [
          "모르겠음",
          "위의 모든 것",
          "해당 없음",
          "정보 부족"
        ];
        const dummy = dummyAnswers.find(d => !options.includes(d));
        if (dummy) options.push(dummy);
        else break;
      }
      
      // 선택지 섞기
      const shuffledOptions = options.sort(() => Math.random() - 0.5);
      
      return {
        id: note.id,
        question: note.question,
        options: shuffledOptions,
        correctAnswers: [note.source_text],
        answerType: 'single' as const,
        explanation: note.explanation,
        originalNote: note
      };
    });
    
    setQuizQuestions(questions.sort(() => Math.random() - 0.5)); // 문제 순서도 섞기
  };

  const handleAnswerSubmit = async () => {
    if (selectedAnswers.length === 0) return;
    
    setAnswered(true);
    
    // Validate answer based on type
    let isCorrect = false;
    if (currentQuestion.answerType === 'single') {
      isCorrect = selectedAnswers[0] === currentQuestion.correctAnswers[0];
    } else {
      // Multiple choice: must match exactly
      const selectedSet = new Set(selectedAnswers);
      const correctSet = new Set(currentQuestion.correctAnswers);
      
      if (selectedSet.size !== correctSet.size) {
        isCorrect = false;
      } else {
        isCorrect = true;
        for (const answer of selectedSet) {
          if (!correctSet.has(answer)) {
            isCorrect = false;
            break;
          }
        }
      }
    }
    
    if (isCorrect) {
      setScore(score + 1);
    }

    try {
      // 학습 세션 기록
      const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      
      await supabase.from("study_sessions").insert({
        wrong_note_id: currentQuestion.id,
        session_type: "quiz",
        score: isCorrect ? 100 : 0,
        confidence_level: isCorrect ? 5 : 2,
        time_spent: timeSpent,
        user_id: null // RLS가 있어서 자동으로 설정됨
      });

      // 암기 체크리스트 업데이트
      await supabase
        .from("memorization_checklist")
        .upsert({
          wrong_note_id: currentQuestion.id,
          is_memorized: isCorrect,
          confidence_level: isCorrect ? 5 : 2,
          last_reviewed_at: new Date().toISOString(),
          user_id: null // RLS가 있어서 자동으로 설정됨
        }, {
          onConflict: "user_id,wrong_note_id"
        });

    } catch (error) {
      console.error("Error recording quiz result:", error);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswers([]);
      setAnswered(false);
      setStartTime(new Date());
    } else {
      setQuizCompleted(true);
      recordFinalScore();
    }
  };

  const recordFinalScore = async () => {
    try {
      const finalScore = Math.round((score / quizQuestions.length) * 100);
      
      toast({
        title: "퀴즈 완료!",
        description: `점수: ${score}/${quizQuestions.length} (${finalScore}%)`,
      });

    } catch (error) {
      console.error("Error recording final score:", error);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setAnswered(false);
    setScore(0);
    setQuizCompleted(false);
    setStartTime(new Date());
    generateQuizQuestions();
  };

  const handleCheckboxChange = (option: string, checked: boolean) => {
    if (checked) {
      setSelectedAnswers([...selectedAnswers, option]);
    } else {
      setSelectedAnswers(selectedAnswers.filter(a => a !== option));
    }
  };

  if (quizQuestions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p>퀴즈를 생성하는 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (quizCompleted) {
    const finalScore = Math.round((score / quizQuestions.length) * 100);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">퀴즈 완료!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="text-6xl font-bold text-primary">
            {finalScore}%
          </div>
          <p className="text-xl">
            {score}개 정답 / 총 {quizQuestions.length}문제
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

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="outline">
          문제 {currentQuestionIndex + 1} / {quizQuestions.length}
        </Badge>
        <Badge variant="secondary">
          점수: {score} / {currentQuestionIndex + (answered ? 1 : 0)}
        </Badge>
      </div>

      <Progress value={progress} className="w-full" />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">
              {currentQuestion.originalNote.subject_name} &gt; {currentQuestion.originalNote.book_name}
            </Badge>
            {currentQuestion.answerType === 'multiple' && (
              <Badge variant="secondary">
                {currentQuestion.instruction || `정답 ${currentQuestion.correctAnswers.length}개`}
              </Badge>
            )}
          </div>
          <div className="text-lg">
            <HtmlContent content={currentQuestion.question} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentQuestion.answerType === 'single' ? (
            <RadioGroup
              value={selectedAnswers[0] || ""}
              onValueChange={(value) => setSelectedAnswers([value])}
              disabled={answered}
            >
              {currentQuestion.options.map((option, index) => {
                const isCorrect = currentQuestion.correctAnswers.includes(option);
                const isSelected = selectedAnswers.includes(option);
                const showResult = answered;
                
                return (
                  <div
                    key={index}
                    className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                      showResult
                        ? isCorrect
                          ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                          : isSelected
                          ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                          : ""
                        : "hover:bg-muted"
                    }`}
                  >
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label 
                      htmlFor={`option-${index}`} 
                      className={`flex-1 cursor-pointer ${showResult && isCorrect ? 'font-bold' : ''}`}
                    >
                      {option}
                    </Label>
                    {showResult && isCorrect && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                );
              })}
            </RadioGroup>
          ) : (
            <div className="space-y-2">
              {currentQuestion.options.map((option, index) => {
                const isCorrect = currentQuestion.correctAnswers.includes(option);
                const isSelected = selectedAnswers.includes(option);
                const showResult = answered;
                
                return (
                  <div
                    key={index}
                    className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                      showResult
                        ? isCorrect
                          ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                          : isSelected
                          ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                          : ""
                        : "hover:bg-muted"
                    }`}
                  >
                    <Checkbox 
                      id={`option-${index}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleCheckboxChange(option, checked as boolean)}
                      disabled={answered}
                    />
                    <Label 
                      htmlFor={`option-${index}`} 
                      className={`flex-1 cursor-pointer ${showResult && isCorrect ? 'font-bold' : ''}`}
                    >
                      {option}
                    </Label>
                    {showResult && isCorrect && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {answered && currentQuestion.explanation && (
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-600 mb-2">설명</h4>
              <div className="text-blue-700 dark:text-blue-300">
                <HtmlContent content={currentQuestion.explanation} />
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <div></div>
            {!answered ? (
              <Button onClick={handleAnswerSubmit} disabled={selectedAnswers.length === 0}>
                답안 제출
              </Button>
            ) : (
              <Button onClick={nextQuestion}>
                {currentQuestionIndex < quizQuestions.length - 1 ? "다음 문제" : "결과 보기"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}