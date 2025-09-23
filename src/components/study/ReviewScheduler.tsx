import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Brain, AlertCircle, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReviewItem {
  id: string;
  wrong_note_id: string;
  next_review_date: string;
  review_count: number;
  interval_days: number;
  ease_factor: number;
  is_completed: boolean;
  wrong_note: {
    question: string;
    subject_name: string;
    book_name: string;
    chapter_name: string;
  };
}

interface ReviewSchedulerProps {
  subject?: string;
  book?: string;
  chapter?: string;
}

export function ReviewScheduler({ subject, book, chapter }: ReviewSchedulerProps) {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [todayReviews, setTodayReviews] = useState<ReviewItem[]>([]);
  const [upcomingReviews, setUpcomingReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadReviewSchedule();
  }, [subject, book, chapter]);

  const loadReviewSchedule = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("review_schedule")
        .select(`
          *,
          wrong_note:wrong_notes(
            question,
            subject_name,
            book_name,
            chapter_name
          )
        `)
        .eq("is_completed", false)
        .order("next_review_date", { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      // 필터링 (클라이언트 사이드에서 실행)
      let filteredData = data || [];
      if (subject) {
        filteredData = filteredData.filter(item => 
          item.wrong_note?.subject_name === subject
        );
      }
      if (book) {
        filteredData = filteredData.filter(item => 
          item.wrong_note?.book_name === book
        );
      }
      if (chapter) {
        filteredData = filteredData.filter(item => 
          item.wrong_note?.chapter_name === chapter
        );
      }

      setReviewItems(filteredData);

      // 오늘 복습할 항목들
      const today = new Date().toISOString().split('T')[0];
      const todayItems = filteredData.filter(item => 
        item.next_review_date.split('T')[0] <= today
      );
      setTodayReviews(todayItems);

      // 앞으로 복습할 항목들
      const upcomingItems = filteredData.filter(item => 
        item.next_review_date.split('T')[0] > today
      ).slice(0, 10); // 최대 10개만
      setUpcomingReviews(upcomingItems);

    } catch (error) {
      console.error("Error loading review schedule:", error);
      toast({
        title: "오류",
        description: "복습 일정을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTodayReviewDocument = async () => {
    if (todayReviews.length === 0) {
      toast({
        title: "안내",
        description: "오늘 복습할 문제가 없습니다.",
        variant: "default"
      });
      return;
    }

    try {
      // WrongNote 형태로 변환
      const wrongNotes = todayReviews.map(item => ({
        id: item.wrong_note_id,
        question: item.wrong_note?.question || "",
        sourceText: `${item.wrong_note?.subject_name} > ${item.wrong_note?.book_name} > ${item.wrong_note?.chapter_name}`,
        explanation: "복습용 문제",
        createdAt: new Date(),
        isResolved: false
      }));

      // 동적 import로 템플릿 생성 함수 가져오기
      const { generateWordFromTemplate } = await import("@/utils/templateGenerator");
      await generateWordFromTemplate(wrongNotes);

      toast({
        title: "문서 생성 완료",
        description: `오늘 복습할 ${todayReviews.length}개 문제의 Word 문서가 다운로드되었습니다.`,
      });

    } catch (error) {
      console.error("Error generating document:", error);
      toast({
        title: "오류",
        description: "문서 생성에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const markAsReviewed = async (reviewId: string, performance: number) => {
    try {
      const reviewItem = reviewItems.find(item => item.id === reviewId);
      if (!reviewItem) return;

      // 새로운 복습 간격 계산
      const newInterval = calculateNextInterval(
        reviewItem.interval_days,
        reviewItem.ease_factor,
        performance
      );

      const nextReviewDate = new Date();
      if (newInterval === 0) {
        // 20분 후
        nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 20);
      } else if (newInterval === -1) {
        // 당일 자정
        nextReviewDate.setHours(23, 59, 59, 999);
      } else {
        // N일 후
        nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
      }

      // 복습 스케줄 업데이트
      await supabase
        .from("review_schedule")
        .update({
          review_count: reviewItem.review_count + 1,
          next_review_date: nextReviewDate.toISOString(),
          interval_days: newInterval,
          ease_factor: calculateNewEaseFactor(reviewItem.ease_factor, performance),
          is_completed: performance >= 4 // 자신감 4 이상이면 완료로 처리
        })
        .eq("id", reviewId);

      // 학습 세션 기록
      await supabase.from("study_sessions").insert({
        wrong_note_id: reviewItem.wrong_note_id,
        session_type: "review",
        confidence_level: performance,
        time_spent: 60, // 기본 1분
        user_id: null // RLS가 있어서 자동으로 설정됨
      });

      // 암기 체크리스트 업데이트
      await supabase
        .from("memorization_checklist")
        .upsert({
          wrong_note_id: reviewItem.wrong_note_id,
          is_memorized: performance >= 4,
          confidence_level: performance,
          last_reviewed_at: new Date().toISOString(),
          user_id: null // RLS가 있어서 자동으로 설정됨
        }, {
          onConflict: "user_id,wrong_note_id"
        });

      toast({
        title: "복습 완료",
        description: `다음 복습 예정일: ${nextReviewDate.toLocaleDateString('ko-KR')}`,
      });

      // 데이터 다시 로드
      loadReviewSchedule();

    } catch (error) {
      console.error("Error marking as reviewed:", error);
      toast({
        title: "오류",
        description: "복습 기록에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const calculateNextInterval = (currentInterval: number, easeFactor: number, performance: number): number => {
    // 에빙하우스 망각곡선에 따른 최적 복습 간격
    // 20분 → 1일 → 3일 → 7일 → 14일 → 30일
    const ebbinghausIntervals = [0, 1, 3, 7, 14, 30];
    
    if (performance < 3) {
      // 성과가 낮으면 20분 후 다시 복습 (처음부터 시작)
      return 0; // 0은 20분을 의미
    }
    
    // 현재 단계 찾기
    let currentStage = 0;
    if (currentInterval === 0) {
      currentStage = 0; // 20분 단계
    } else {
      // 현재 간격에 맞는 단계 찾기
      for (let i = 1; i < ebbinghausIntervals.length; i++) {
        if (currentInterval <= ebbinghausIntervals[i]) {
          currentStage = i;
          break;
        }
      }
      // 최대 단계를 넘어선 경우
      if (currentStage === 0) {
        currentStage = ebbinghausIntervals.length - 1;
      }
    }
    
    // 다음 단계로 진행
    if (currentStage === 0) {
      // 20분 → 1일
      return ebbinghausIntervals[1];
    } else if (currentStage < ebbinghausIntervals.length - 1) {
      // 다음 에빙하우스 단계로
      return ebbinghausIntervals[currentStage + 1];
    } else {
      // 마지막 단계에서는 30일씩 계속 연장
      return currentInterval + 30;
    }
  };

  const calculateNewEaseFactor = (currentEF: number, performance: number): number => {
    // SuperMemo 알고리즘 기반 ease factor 조정
    const newEF = currentEF + (0.1 - (5 - performance) * (0.08 + (5 - performance) * 0.02));
    return Math.max(1.3, newEF);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="h-6 bg-muted rounded mb-2 animate-pulse"></div>
            <div className="h-8 bg-muted rounded animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 오늘의 복습 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              오늘 복습할 문제들
              <Badge variant="destructive">{todayReviews.length}</Badge>
            </CardTitle>
            <Button
              onClick={generateTodayReviewDocument}
              disabled={todayReviews.length === 0}
              size="sm"
              className="flex items-center gap-2"
            >
              <FileDown className="h-4 w-4" />
              복습 문서 생성
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {todayReviews.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              오늘 복습할 문제가 없습니다! 🎉
            </p>
          ) : (
            <div className="space-y-4">
              {todayReviews.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">
                          {item.wrong_note?.subject_name} &gt; {item.wrong_note?.book_name}
                        </Badge>
                        <Badge variant="secondary">
                          {item.review_count}회차
                        </Badge>
                      </div>
                      <p className="font-medium">{item.wrong_note?.question}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      예정일: {new Date(item.next_review_date).toLocaleDateString('ko-KR')}
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <Button
                          key={level}
                          size="sm"
                          variant={level >= 4 ? "default" : "outline"}
                          onClick={() => markAsReviewed(item.id, level)}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 앞으로의 복습 일정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            복습 일정
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingReviews.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              예정된 복습이 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingReviews.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {item.wrong_note?.subject_name}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {item.review_count}회차
                      </Badge>
                    </div>
                    <p className="text-sm font-medium line-clamp-2">
                      {item.wrong_note?.question}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm font-medium">
                      {new Date(item.next_review_date).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.interval_days}일 간격
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 복습 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 복습 항목</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewItems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">평균 복습 횟수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reviewItems.length > 0 
                ? Math.round(reviewItems.reduce((sum, item) => sum + item.review_count, 0) / reviewItems.length)
                : 0
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">평균 간격</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reviewItems.length > 0 
                ? Math.round(reviewItems.reduce((sum, item) => sum + item.interval_days, 0) / reviewItems.length)
                : 0
              }일
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}