import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, HelpCircle, PenTool, ArrowLeft } from "lucide-react";

interface StudyModeSelectorProps {
  noteCount: number;
  onModeSelect: (mode: 'flashcard' | 'multiple-choice' | 'subjective') => void;
  onBack?: () => void;
}

export function StudyModeSelector({ noteCount, onModeSelect, onBack }: StudyModeSelectorProps) {
  return (
    <div className="space-y-6">
      {onBack && (
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          뒤로 가기
        </Button>
      )}
      
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">복습 모드를 선택해주세요</h3>
        <Badge variant="outline" className="text-sm">
          총 {noteCount}개 문제
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => onModeSelect('flashcard')}>
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">플래시카드</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-0">
            <p className="text-sm text-muted-foreground mb-4">
              카드를 뒤집어 정답을 확인하고 자신감 수준을 평가합니다.
            </p>
            <Button className="w-full" onClick={() => onModeSelect('flashcard')}>
              시작하기
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => onModeSelect('multiple-choice')}>
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">객관식</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-0">
            <p className="text-sm text-muted-foreground mb-4">
              여러 선택지 중에서 정답을 골라 빠르게 복습합니다.
            </p>
            <Button className="w-full" onClick={() => onModeSelect('multiple-choice')}>
              시작하기
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => onModeSelect('subjective')}>
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <PenTool className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">주관식</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-0">
            <p className="text-sm text-muted-foreground mb-4">
              직접 답안을 작성하고 정답과 비교해 봅니다.
            </p>
            <Button className="w-full" onClick={() => onModeSelect('subjective')}>
              시작하기
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}