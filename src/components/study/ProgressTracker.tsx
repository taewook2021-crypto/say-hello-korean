import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProgressData {
  totalNotes: number;
  memorizedNotes: number;
  studySessions: number;
  averageConfidence: number;
  totalStudyTime: number;
  streakDays: number;
  weeklyProgress: { date: string; sessions: number; confidence: number }[];
}

interface ProgressTrackerProps {
  subject?: string;
  book?: string;
  chapter?: string;
}

export function ProgressTracker({ subject, book, chapter }: ProgressTrackerProps) {
  const [progress, setProgress] = useState<ProgressData>({
    totalNotes: 0,
    memorizedNotes: 0,
    studySessions: 0,
    averageConfidence: 0,
    totalStudyTime: 0,
    streakDays: 0,
    weeklyProgress: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, [subject, book, chapter]);

  const loadProgressData = async () => {
    try {
      setLoading(true);

      // 필터 조건 구성
      let notesFilter = supabase.from("wrong_notes").select("*");
      if (subject) notesFilter = notesFilter.eq("subject_name", subject);
      if (book) notesFilter = notesFilter.eq("book_name", book);
      if (chapter) notesFilter = notesFilter.eq("chapter_name", chapter);

      // 전체 노트 수
      const { data: allNotes, error: notesError } = await notesFilter;
      if (notesError) throw notesError;

      const totalNotes = allNotes?.length || 0;

      // 암기된 노트 수
      let checklistFilter = supabase
        .from("memorization_checklist")
        .select("*, wrong_notes!inner(*)")
        .eq("is_memorized", true);

      if (subject) checklistFilter = checklistFilter.eq("wrong_notes.subject_name", subject);
      if (book) checklistFilter = checklistFilter.eq("wrong_notes.book_name", book);
      if (chapter) checklistFilter = checklistFilter.eq("wrong_notes.chapter_name", chapter);

      const { data: memorizedData } = await checklistFilter;
      const memorizedNotes = memorizedData?.length || 0;

      // 학습 세션 데이터
      let sessionsFilter = supabase
        .from("study_sessions")
        .select("*, wrong_notes!inner(*)");

      if (subject) sessionsFilter = sessionsFilter.eq("wrong_notes.subject_name", subject);
      if (book) sessionsFilter = sessionsFilter.eq("wrong_notes.book_name", book);
      if (chapter) sessionsFilter = sessionsFilter.eq("wrong_notes.chapter_name", chapter);

      const { data: sessions } = await sessionsFilter;
      const studySessions = sessions?.length || 0;

      // 평균 자신감 수준
      const confidenceLevels = sessions?.map(s => s.confidence_level).filter(Boolean) || [];
      const averageConfidence = confidenceLevels.length > 0
        ? confidenceLevels.reduce((a, b) => a + b, 0) / confidenceLevels.length
        : 0;

      // 총 학습 시간 (분 단위)
      const totalStudyTime = Math.round((sessions?.reduce((total, s) => total + (s.time_spent || 0), 0) || 0) / 60);

      // 연속 학습 일수 계산
      const streakDays = await calculateStudyStreak();

      // 주간 진도 데이터
      const weeklyProgress = await getWeeklyProgress(subject, book, chapter);

      setProgress({
        totalNotes,
        memorizedNotes,
        studySessions,
        averageConfidence,
        totalStudyTime,
        streakDays,
        weeklyProgress
      });

    } catch (error) {
      console.error("Error loading progress data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStudyStreak = async (): Promise<number> => {
    try {
      const { data: sessions } = await supabase
        .from("study_sessions")
        .select("completed_at")
        .order("completed_at", { ascending: false });

      if (!sessions || sessions.length === 0) return 0;

      const today = new Date();
      let streak = 0;
      let currentDate = new Date(today);

      // 연속으로 학습한 날짜 계산
      for (let i = 0; i < 30; i++) { // 최대 30일까지 확인
        const dateStr = currentDate.toISOString().split('T')[0];
        const hasStudyOnDate = sessions.some(s => 
          s.completed_at.startsWith(dateStr)
        );

        if (hasStudyOnDate) {
          streak++;
        } else if (streak > 0) {
          break; // 연속이 끊어지면 중단
        }

        currentDate.setDate(currentDate.getDate() - 1);
      }

      return streak;
    } catch (error) {
      console.error("Error calculating streak:", error);
      return 0;
    }
  };

  const getWeeklyProgress = async (subject?: string, book?: string, chapter?: string) => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      let query = supabase
        .from("study_sessions")
        .select("completed_at, confidence_level, wrong_notes!inner(*)")
        .gte("completed_at", oneWeekAgo.toISOString());

      if (subject) query = query.eq("wrong_notes.subject_name", subject);
      if (book) query = query.eq("wrong_notes.book_name", book);
      if (chapter) query = query.eq("wrong_notes.chapter_name", chapter);

      const { data: sessions } = await query;

      // 날짜별로 그룹화
      const dailyData: { [key: string]: { sessions: number; confidence: number[] } } = {};

      sessions?.forEach(session => {
        const date = session.completed_at.split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { sessions: 0, confidence: [] };
        }
        dailyData[date].sessions++;
        if (session.confidence_level) {
          dailyData[date].confidence.push(session.confidence_level);
        }
      });

      // 7일간의 데이터 생성
      const weeklyProgress = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayData = dailyData[dateStr] || { sessions: 0, confidence: [] };
        
        weeklyProgress.push({
          date: dateStr,
          sessions: dayData.sessions,
          confidence: dayData.confidence.length > 0
            ? dayData.confidence.reduce((a, b) => a + b, 0) / dayData.confidence.length
            : 0
        });
      }

      return weeklyProgress;
    } catch (error) {
      console.error("Error getting weekly progress:", error);
      return [];
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded mb-2 animate-pulse"></div>
                <div className="h-8 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const memorizedPercentage = progress.totalNotes > 0 
    ? Math.round((progress.memorizedNotes / progress.totalNotes) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* 주요 지표 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">암기 진도</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memorizedPercentage}%</div>
            <div className="text-xs text-muted-foreground">
              {progress.memorizedNotes} / {progress.totalNotes} 문제
            </div>
            <Progress value={memorizedPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">학습 세션</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.studySessions}</div>
            <div className="text-xs text-muted-foreground">
              총 학습 횟수
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 자신감</CardTitle>
            <Badge variant="secondary">{progress.averageConfidence.toFixed(1)}/5</Badge>
          </CardHeader>
          <CardContent>
            <Progress value={progress.averageConfidence * 20} className="mt-2" />
            <div className="text-xs text-muted-foreground mt-2">
              학습 자신감 수준
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">연속 학습</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.streakDays}</div>
            <div className="text-xs text-muted-foreground">
              일 연속 학습
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 학습 시간 및 주간 진도 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              총 학습 시간
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{progress.totalStudyTime}</div>
            <div className="text-muted-foreground">분</div>
            <div className="mt-4 text-sm">
              평균 세션당: {progress.studySessions > 0 
                ? Math.round(progress.totalStudyTime / progress.studySessions)
                : 0}분
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>주간 학습 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progress.weeklyProgress.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="text-sm">
                    {new Date(day.date).toLocaleDateString('ko-KR', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={day.sessions > 0 ? "default" : "outline"}>
                      {day.sessions}회
                    </Badge>
                    {day.confidence > 0 && (
                      <Badge variant="secondary">
                        {day.confidence.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}