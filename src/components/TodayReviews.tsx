import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, BookOpen, Target, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { StudyModeSelector } from "@/components/study/StudyModeSelector";
import { FlashCard } from "@/components/study/FlashCard";
import { Quiz } from "@/components/study/Quiz";
import { SubjectiveQuiz } from "@/components/study/SubjectiveQuiz";

interface ReviewItem {
  id: string;
  wrong_note_id?: string; // optional for AI cards
  card_id?: string; // optional for AI cards
  next_review_date: string;
  review_count: number;
  interval_days: number;
  question: string;
  correct_answer: string;
  subject_name: string;
  book_name?: string; // optional for AI cards
  chapter_name?: string; // optional for AI cards
  source_type: 'wrong_note' | 'ai_card'; // 구분자
  ease_factor?: number; // for AI cards
  tags?: string[]; // for AI cards
  difficulty?: string; // for AI cards
}

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

export function TodayReviews() {
  const [todayReviews, setTodayReviews] = useState<ReviewItem[]>([]);
  const [upcomingReviews, setUpcomingReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [studyMode, setStudyMode] = useState<'flashcard' | 'multiple-choice' | 'subjective' | null>(null);
  const [showStudyModeSelector, setShowStudyModeSelector] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<WrongNote[]>([]);
  const [aiCards, setAiCards] = useState<AICard[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const now = new Date();
      const today = new Date();
      today.setHours(23, 59, 59, 999); // 오늘 끝까지
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      // 현재 사용자 확인
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. 기존 wrong_notes 기반 복습 데이터
      const { data: todayWrongNotesData, error: todayWrongNotesError } = await supabase
        .from('review_schedule')
        .select(`
          id,
          wrong_note_id,
          next_review_date,
          review_count,
          interval_days,
          wrong_notes!inner (
            question,
            correct_answer,
            subject_name,
            book_name,
            chapter_name
          )
        `)
        .lte('next_review_date', today.toISOString())
        .eq('is_completed', false);

      if (todayWrongNotesError) throw todayWrongNotesError;

      // 2. 새로운 AI cards 기반 복습 데이터
      const { data: todayAICardsData, error: todayAICardsError } = await supabase
        .from('cards')
        .select(`
          id,
          front,
          back,
          next_review_date,
          ease_factor,
          interval_days,
          reviewed_count,
          qa_pairs!inner (
            q_text,
            a_text,
            tags,
            difficulty,
            conversations!inner (
              subject,
              user_id
            )
          )
        `)
        .lte('next_review_date', today.toISOString())
        .eq('qa_pairs.conversations.user_id', user.id);

      if (todayAICardsError) throw todayAICardsError;

      // 3. 향후 7일간 복습할 문제들 (기존 wrong_notes)
      const { data: upcomingWrongNotesData, error: upcomingWrongNotesError } = await supabase
        .from('review_schedule')
        .select(`
          id,
          wrong_note_id,
          next_review_date,
          review_count,
          interval_days,
          wrong_notes!inner (
            question,
            correct_answer,
            subject_name,
            book_name,
            chapter_name
          )
        `)
        .gt('next_review_date', today.toISOString())
        .lte('next_review_date', nextWeek.toISOString())
        .eq('is_completed', false)
        .order('next_review_date', { ascending: true });

      if (upcomingWrongNotesError) throw upcomingWrongNotesError;

      // 4. 향후 7일간 복습할 AI 카드들
      const { data: upcomingAICardsData, error: upcomingAICardsError } = await supabase
        .from('cards')
        .select(`
          id,
          front,
          back,
          next_review_date,
          ease_factor,
          interval_days,
          reviewed_count,
          qa_pairs!inner (
            q_text,
            a_text,
            tags,
            difficulty,
            conversations!inner (
              subject,
              user_id
            )
          )
        `)
        .gt('next_review_date', today.toISOString())
        .lte('next_review_date', nextWeek.toISOString())
        .eq('qa_pairs.conversations.user_id', user.id)
        .order('next_review_date', { ascending: true });

      if (upcomingAICardsError) throw upcomingAICardsError;

      // 데이터 포맷팅 함수들
      const formatWrongNotesData = (data: any[]): ReviewItem[] => {
        return data.map(item => ({
          id: item.id,
          wrong_note_id: item.wrong_note_id,
          next_review_date: item.next_review_date,
          review_count: item.review_count,
          interval_days: item.interval_days,
          question: item.wrong_notes.question,
          correct_answer: item.wrong_notes.correct_answer,
          subject_name: item.wrong_notes.subject_name,
          book_name: item.wrong_notes.book_name,
          chapter_name: item.wrong_notes.chapter_name,
          source_type: 'wrong_note' as const,
        }));
      };

      const formatAICardsData = (data: any[]): ReviewItem[] => {
        return data.map(item => ({
          id: item.id,
          card_id: item.id,
          next_review_date: item.next_review_date,
          review_count: item.reviewed_count,
          interval_days: item.interval_days,
          question: item.front,
          correct_answer: item.back,
          subject_name: item.qa_pairs.conversations.subject,
          source_type: 'ai_card' as const,
          ease_factor: item.ease_factor,
          tags: item.qa_pairs.tags,
          difficulty: item.qa_pairs.difficulty,
        }));
      };

      // 오늘 복습할 항목들 (기존 + AI 카드 통합)
      const todayWrongNotesFormatted = formatWrongNotesData(todayWrongNotesData || []);
      const todayAICardsFormatted = formatAICardsData(todayAICardsData || []);
      const allTodayReviews = [...todayWrongNotesFormatted, ...todayAICardsFormatted];

      // 향후 복습할 항목들 (기존 + AI 카드 통합)
      const upcomingWrongNotesFormatted = formatWrongNotesData(upcomingWrongNotesData || []);
      const upcomingAICardsFormatted = formatAICardsData(upcomingAICardsData || []);
      const allUpcomingReviews = [...upcomingWrongNotesFormatted, ...upcomingAICardsFormatted];

      // 날짜순 정렬
      allUpcomingReviews.sort((a, b) => new Date(a.next_review_date).getTime() - new Date(b.next_review_date).getTime());

      setTodayReviews(allTodayReviews);
      setUpcomingReviews(allUpcomingReviews);

    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const startQuickReview = async () => {
    try {
      // 기존 오답노트와 AI 카드 분리해서 처리
      const wrongNoteIds = todayReviews
        .filter(review => review.source_type === 'wrong_note')
        .map(review => review.wrong_note_id)
        .filter(id => id !== undefined);
      
      const aiCardReviews = todayReviews
        .filter(review => review.source_type === 'ai_card');

      let notes: WrongNote[] = [];
      let cards: AICard[] = [];

      // 오답노트 데이터 가져오기
      if (wrongNoteIds.length > 0) {
        const { data: notesData, error: notesError } = await supabase
          .from('wrong_notes')
          .select('*')
          .in('id', wrongNoteIds);
        
        if (notesError) throw notesError;
        notes = notesData || [];
      }

      // AI 카드 데이터는 이미 todayReviews에 있으므로 변환만 필요
      cards = aiCardReviews.map(review => ({
        id: review.card_id!,
        front: review.question,
        back: review.correct_answer,
        next_review_date: review.next_review_date,
        ease_factor: review.ease_factor!,
        interval_days: review.interval_days,
        reviewed_count: review.review_count,
        qa_pairs: {
          q_text: review.question,
          a_text: review.correct_answer,
          tags: review.tags || [],
          difficulty: review.difficulty || 'basic',
          conversations: {
            subject: review.subject_name
          }
        }
      }));
      
      setReviewNotes(notes);
      setAiCards(cards);
      setShowStudyModeSelector(true);
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
    loadReviews(); // 복습 완료 후 데이터 새로고침
  };

  const handleBackToReviews = () => {
    setStudyMode(null);
    setShowStudyModeSelector(false);
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
          noteCount={reviewNotes.length + aiCards.length} 
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
        <FlashCard 
          notes={reviewNotes} 
          aiCards={aiCards}
          onComplete={handleStudyComplete} 
        />
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
        <Quiz 
          notes={reviewNotes} 
          aiCards={aiCards}
          onComplete={handleStudyComplete} 
        />
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
        <SubjectiveQuiz 
          notes={reviewNotes} 
          aiCards={aiCards}
          onComplete={handleStudyComplete} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 오늘 복습할 문제들 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              오늘 복습할 문제
              <Badge variant="destructive">{todayReviews.length}</Badge>
            </CardTitle>
            {todayReviews.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={startQuickReview}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                빠르게 복습하기
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