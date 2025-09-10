import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, FileText, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Chapter {
  name: string;
  book_name: string;
  noteCount: number;
  unresolvedCount: number;
  lastActivity: Date | null;
}

const WrongNoteSubject = () => {
  const { subjectName } = useParams<{ subjectName: string }>();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const subject = decodeURIComponent(subjectName || '');

  useEffect(() => {
    if (subject) {
      loadChapters();
    }
  }, [subject]);

  const loadChapters = async () => {
    try {
      // 해당 과목의 모든 오답노트에서 단원별로 그룹화
      const { data: wrongNotes, error } = await supabase
        .from('wrong_notes')
        .select('chapter_name, book_name, is_resolved, created_at')
        .eq('subject_name', subject);

      if (error) throw error;

      // 단원별로 그룹화하고 통계 계산
      const chapterMap = new Map<string, Chapter>();

      wrongNotes?.forEach(note => {
        const key = `${note.book_name}-${note.chapter_name}`;
        
        if (!chapterMap.has(key)) {
          chapterMap.set(key, {
            name: note.chapter_name,
            book_name: note.book_name,
            noteCount: 0,
            unresolvedCount: 0,
            lastActivity: null
          });
        }

        const chapter = chapterMap.get(key)!;
        chapter.noteCount++;
        
        if (!note.is_resolved) {
          chapter.unresolvedCount++;
        }

        const noteDate = new Date(note.created_at);
        if (!chapter.lastActivity || noteDate > chapter.lastActivity) {
          chapter.lastActivity = noteDate;
        }
      });

      setChapters(Array.from(chapterMap.values()).sort((a, b) => {
        // 미해결 문제가 있는 것을 우선 정렬, 그 다음 최근 활동 순
        if (a.unresolvedCount > 0 && b.unresolvedCount === 0) return -1;
        if (a.unresolvedCount === 0 && b.unresolvedCount > 0) return 1;
        
        if (a.lastActivity && b.lastActivity) {
          return b.lastActivity.getTime() - a.lastActivity.getTime();
        }
        
        return a.name.localeCompare(b.name);
      }));
    } catch (error) {
      console.error('Error loading chapters:', error);
      toast({
        title: "오류",
        description: "단원 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatLastActivity = (date: Date | null) => {
    if (!date) return '활동 없음';
    
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              홈으로
            </Button>
          </Link>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">단원 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            홈으로
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{subject}</h1>
        <p className="text-muted-foreground">오답노트가 있는 단원 목록</p>
        
        <div className="flex gap-4 mt-4">
          <div className="text-sm">
            <span className="font-medium">{chapters.length}</span>개 단원
          </div>
          <div className="text-sm">
            <span className="font-medium">{chapters.reduce((sum, ch) => sum + ch.noteCount, 0)}</span>개 오답노트
          </div>
          <div className="text-sm">
            <span className="font-medium text-destructive">{chapters.reduce((sum, ch) => sum + ch.unresolvedCount, 0)}</span>개 미해결
          </div>
        </div>
      </div>

      {chapters.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">아직 오답노트가 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              이 과목에 대한 오답노트를 먼저 작성해보세요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter, index) => (
            <Link
              key={`${chapter.book_name}-${chapter.name}`}
              to={`/notes/${encodeURIComponent(subject)}/${encodeURIComponent(chapter.book_name)}/${encodeURIComponent(chapter.name)}`}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{chapter.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {chapter.book_name}
                      </p>
                    </div>
                    {chapter.unresolvedCount > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {chapter.unresolvedCount}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">총 문제</span>
                      <span className="font-medium">{chapter.noteCount}개</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">미해결</span>
                      <span className={`font-medium ${chapter.unresolvedCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {chapter.unresolvedCount}개
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        최근 활동
                      </span>
                      <span className="font-medium">
                        {formatLastActivity(chapter.lastActivity)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default WrongNoteSubject;