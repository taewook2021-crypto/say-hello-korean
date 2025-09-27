import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, BookOpen, Target, ArrowLeft, FileText, Download } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { StudyModeSelector } from "@/components/study/StudyModeSelector";
import { FlashCard } from "@/components/study/FlashCard";
import { Quiz } from "@/components/study/Quiz";
import { SubjectiveQuiz } from "@/components/study/SubjectiveQuiz";
import { TemplateDocumentGenerator } from "@/components/study/TemplateDocumentGenerator";
import { toast } from "sonner";

interface ReviewItem {
  id: string;
  wrong_note_id: string;
  next_review_date: string;
  review_count: number;
  interval_days: number;
  question: string;
  source_text: string;
  subject_name: string;
  book_name: string;
  chapter_name: string;
}

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

interface TodayReviewsProps {
  onStudyModeChange?: (isStudying: boolean) => void;
}

export function TodayReviews({ onStudyModeChange }: TodayReviewsProps = {}) {
  const [todayReviews, setTodayReviews] = useState<ReviewItem[]>([]);
  const [upcomingReviews, setUpcomingReviews] = useState<ReviewItem[]>([]);
  const [todayCreatedNotes, setTodayCreatedNotes] = useState<WrongNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [studyMode, setStudyMode] = useState<'flashcard' | 'multiple-choice' | 'subjective' | null>(null);
  const [showStudyModeSelector, setShowStudyModeSelector] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<WrongNote[]>([]);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const now = new Date();
      const today = new Date();
      today.setHours(23, 59, 59, 999); // 오늘 끝까지
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0); // 오늘 시작
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      // 오늘 복습할 문제들 (현재 시간 이전 또는 오늘 안에 예정된 것들)
      const { data: todayData, error: todayError } = await supabase
        .from('review_schedule')
        .select(`
          id,
          wrong_note_id,
          next_review_date,
          review_count,
          interval_days,
          wrong_notes!inner (
            question,
            source_text,
            subject_name,
            book_name,
            chapter_name
          )
        `)
        .lte('next_review_date', today.toISOString())
        .eq('is_completed', false);

      if (todayError) throw todayError;

      // 향후 7일간 복습할 문제들
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('review_schedule')
        .select(`
          id,
          wrong_note_id,
          next_review_date,
          review_count,
          interval_days,
          wrong_notes!inner (
            question,
            source_text,
            subject_name,
            book_name,
            chapter_name
          )
        `)
        .gt('next_review_date', today.toISOString())
        .lte('next_review_date', nextWeek.toISOString())
        .eq('is_completed', false)
        .order('next_review_date', { ascending: true });

      if (upcomingError) throw upcomingError;

      // 오늘 생성된 오답노트들
      const { data: todayNotesData, error: todayNotesError } = await supabase
        .from('wrong_notes')
        .select('*')
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (todayNotesError) throw todayNotesError;

      const formatReviewData = (data: any[]): ReviewItem[] => {
        return data.map(item => ({
          id: item.id,
          wrong_note_id: item.wrong_note_id,
          next_review_date: item.next_review_date,
          review_count: item.review_count,
          interval_days: item.interval_days,
          question: item.wrong_notes.question,
          source_text: item.wrong_notes.source_text,
          subject_name: item.wrong_notes.subject_name,
          book_name: item.wrong_notes.book_name,
          chapter_name: item.wrong_notes.chapter_name,
        }));
      };

      const formatWrongNoteData = (data: any[]): WrongNote[] => {
        return data.map(item => ({
          id: item.id,
          question: item.question,
          source_text: item.source_text,
          explanation: item.explanation,
          subject_name: item.subject_name,
          book_name: item.book_name,
          chapter_name: item.chapter_name,
          is_resolved: item.is_resolved
        }));
      };

      setTodayReviews(formatReviewData(todayData || []));
      setUpcomingReviews(formatReviewData(upcomingData || []));
      setTodayCreatedNotes(formatWrongNoteData(todayNotesData || []));

    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const startQuickReview = async () => {
    try {
      // 오늘 복습할 문제들의 오답노트 정보 가져오기
      const noteIds = todayReviews.map(review => review.wrong_note_id);
      
      const { data: notes, error } = await supabase
        .from('wrong_notes')
        .select('*')
        .in('id', noteIds);
      
      if (error) throw error;
      
      console.log('Review notes from TodayReviews:', notes);
      setReviewNotes(notes || []);
      setShowStudyModeSelector(true);
      onStudyModeChange?.(true);
    } catch (error) {
      console.error('Error loading review notes:', error);
    }
  };

  const handleModeSelect = (mode: 'flashcard' | 'multiple-choice' | 'subjective') => {
    setStudyMode(mode);
    setShowStudyModeSelector(false);
  };

  const handleStudyComplete = () => {
    setStudyMode(null);
    setShowStudyModeSelector(false);
    onStudyModeChange?.(false);
    loadReviews(); // 복습 완료 후 데이터 새로고침
  };

  const handleBackToReviews = () => {
    setStudyMode(null);
    setShowStudyModeSelector(false);
    onStudyModeChange?.(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "오늘";
    if (diffDays === 1) return "내일";
    if (diffDays === -1) return "어제";
    return `${Math.abs(diffDays)}일 ${diffDays > 0 ? '후' : '전'}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="h-4 bg-muted rounded w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // 스터디 모드 화면들
  if (showStudyModeSelector) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleBackToReviews}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <h2 className="text-lg font-semibold">빠른 복습</h2>
        </div>
        <StudyModeSelector 
          noteCount={reviewNotes.length} 
          onModeSelect={handleModeSelect} 
        />
      </div>
    );
  }

  if (studyMode === 'flashcard') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleBackToReviews}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <h2 className="text-lg font-semibold">플래시카드 복습</h2>
        </div>
        <FlashCard notes={reviewNotes} onComplete={handleStudyComplete} />
      </div>
    );
  }

  if (studyMode === 'multiple-choice') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleBackToReviews}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <h2 className="text-lg font-semibold">객관식 퀴즈</h2>
        </div>
        <Quiz notes={reviewNotes} onComplete={handleStudyComplete} />
      </div>
    );
  }

  if (studyMode === 'subjective') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleBackToReviews}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <h2 className="text-lg font-semibold">주관식 퀴즈</h2>
        </div>
        <SubjectiveQuiz notes={reviewNotes} onComplete={handleStudyComplete} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 오늘 생성한 문제들 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              오늘 생성한 문제
              <Badge variant="secondary">{todayCreatedNotes.length}</Badge>
            </CardTitle>
            {todayCreatedNotes.length > 0 && (
              <TemplateDocumentGenerator 
                notes={todayCreatedNotes.map(note => ({
                  id: note.id,
                  question: note.question,
                  sourceText: note.source_text,
                  explanation: note.explanation || '',
                  createdAt: new Date(),
                  isResolved: note.is_resolved
                }))}
                subject="오늘 생성"
                book="전체"
                chapter="문제"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {todayCreatedNotes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              오늘 생성한 문제가 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                오늘 {todayCreatedNotes.length}개의 새로운 문제를 생성했습니다.
              </p>
              <div className="flex flex-wrap gap-2">
                {todayCreatedNotes.slice(0, 3).map((note, index) => (
                  <Badge key={note.id} variant="outline" className="text-xs">
                    {note.subject_name} - {note.book_name}
                  </Badge>
                ))}
                {todayCreatedNotes.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{todayCreatedNotes.length - 3}개 더
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 오늘 복습할 문제들 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              오늘 복습할 문제
              {!isMobile && <Badge variant="secondary">{todayReviews.length}</Badge>}
            </CardTitle>
            {todayReviews.length > 0 && (
              <Button 
                variant="outline" 
                size={isMobile ? "icon" : "sm"}
                onClick={startQuickReview}
                className={isMobile ? "shrink-0" : ""}
              >
                <BookOpen className={`h-4 w-4 ${!isMobile ? 'mr-2' : ''}`} />
                {!isMobile && '빠르게 복습하기'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {todayReviews.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              오늘 복습할 문제가 없습니다! 🎉
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {todayReviews.length}개의 문제가 복습 대기 중입니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}