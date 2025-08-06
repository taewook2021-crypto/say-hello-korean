import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, BookOpen, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ReviewItem {
  id: string;
  wrong_note_id: string;
  next_review_date: string;
  review_count: number;
  interval_days: number;
  question: string;
  correct_answer: string;
  subject_name: string;
  book_name: string;
  chapter_name: string;
}

export function TodayReviews() {
  const [todayReviews, setTodayReviews] = useState<ReviewItem[]>([]);
  const [upcomingReviews, setUpcomingReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
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
            correct_answer,
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

      if (upcomingError) throw upcomingError;

      const formatReviewData = (data: any[]): ReviewItem[] => {
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
        }));
      };

      setTodayReviews(formatReviewData(todayData || []));
      setUpcomingReviews(formatReviewData(upcomingData || []));

    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const startReview = (subjectName: string, bookName: string, chapterName: string) => {
    navigate(`/notes?subject=${encodeURIComponent(subjectName)}&book=${encodeURIComponent(bookName)}&chapter=${encodeURIComponent(chapterName)}`);
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

  return (
    <div className="space-y-6">
      {/* 오늘 복습할 문제들 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />
            오늘 복습할 문제
            <Badge variant="destructive">{todayReviews.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayReviews.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              오늘 복습할 문제가 없습니다! 🎉
            </p>
          ) : (
            <div className="space-y-3">
              {todayReviews.map((review) => (
                <div key={review.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">
                        {review.subject_name} &gt; {review.book_name}
                      </Badge>
                      <Badge variant="secondary">
                        {review.review_count + 1}회차 복습
                      </Badge>
                    </div>
                    <p className="text-sm font-medium line-clamp-2">
                      {review.question}
                    </p>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => startReview(review.subject_name, review.book_name, review.chapter_name)}
                  >
                    복습하기
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 향후 복습 일정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            다가오는 복습 일정
            <Badge variant="outline">{upcomingReviews.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingReviews.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              예정된 복습이 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingReviews.map((review) => (
                <div key={review.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">
                        {review.subject_name} &gt; {review.book_name}
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(review.next_review_date)}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium line-clamp-2">
                      {review.question}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}