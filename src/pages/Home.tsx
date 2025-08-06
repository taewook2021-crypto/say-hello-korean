import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Calendar, Plus, FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { TodayReviews } from "@/components/TodayReviews";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  subjects: number;
  books: number;
  wrongNotes: number;
}

const Home = () => {
  const [stats, setStats] = useState<Stats>({ subjects: 0, books: 0, wrongNotes: 0 });
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadSubjects();
  }, []);

  const loadStats = async () => {
    try {
      // 과목 수
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id', { count: 'exact' });
      
      if (subjectsError) throw subjectsError;

      // 교재 수
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('id', { count: 'exact' });
      
      if (booksError) throw booksError;

      // 오답노트 수
      const { data: notesData, error: notesError } = await supabase
        .from('wrong_notes')
        .select('id', { count: 'exact' });
      
      if (notesError) throw notesError;

      setStats({
        subjects: subjectsData?.length || 0,
        books: booksData?.length || 0,
        wrongNotes: notesData?.length || 0,
      });

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('name')
        .order('name');
      
      if (error) throw error;
      
      setSubjects(data?.map((subject: any) => subject.name) || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            오답노트
          </h1>
          <p className="text-lg text-muted-foreground">
            체계적인 복습으로 완벽한 학습을
          </p>
        </div>

        {/* 오늘의 복습 */}
        <div className="mb-8">
          <TodayReviews />
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 과목 수</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.subjects}</div>
              <p className="text-xs text-muted-foreground">등록된 과목</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 교재 수</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.books}</div>
              <p className="text-xs text-muted-foreground">등록된 교재</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 오답 수</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.wrongNotes}</div>
              <p className="text-xs text-muted-foreground">기록된 오답</p>
            </CardContent>
          </Card>
        </div>

        {/* 과목 선택 섹션 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                과목 선택
              </CardTitle>
              <Link to="/index">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  과목 관리
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index} className="p-4 text-center animate-pulse">
                    <CardContent className="p-0">
                      <div className="h-12 w-12 bg-muted rounded mx-auto mb-2" />
                      <div className="h-4 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">등록된 과목이 없습니다</h3>
                <p className="text-muted-foreground mb-4">
                  첫 번째 과목을 추가해보세요!
                </p>
                <Link to="/index">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    과목 추가하기
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {subjects.map((subject, index) => (
                  <Link key={index} to={`/subject/${encodeURIComponent(subject)}`}>
                    <Card className="p-4 text-center cursor-pointer hover:bg-accent transition-colors">
                      <CardContent className="p-0">
                        <FolderOpen className="h-12 w-12 text-primary mx-auto mb-2" />
                        <p className="text-sm font-medium">{subject}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>빠른 시작</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/index">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  새 과목 추가
                </Button>
              </Link>
              {subjects.length > 0 && (
                <Link to={`/subject/${encodeURIComponent(subjects[0])}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="h-4 w-4 mr-2" />
                    최근 과목으로 이동
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>복습 안내</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>📚 오답노트를 추가하면 자동으로 복습 일정이 생성됩니다</p>
                <p>🗓️ 에빙하우스 망각곡선에 따라 복습 주기가 조정됩니다</p>
                <p>🎯 오늘 복습할 문제들이 위에 표시됩니다</p>
                <p>✅ 복습 완료 시 다음 복습 날짜가 자동 업데이트됩니다</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;