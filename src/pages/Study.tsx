import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ChevronLeft, BookOpen, Brain, Target, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { FlashCard } from "@/components/study/FlashCard";
import { Quiz } from "@/components/study/Quiz";
import { ProgressTracker } from "@/components/study/ProgressTracker";
import { ReviewScheduler } from "@/components/study/ReviewScheduler";

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

export default function Study() {
  const [searchParams] = useSearchParams();
  const [notes, setNotes] = useState<WrongNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("flashcard");

  const subject = searchParams.get("subject") || "";
  const book = searchParams.get("book") || "";
  const chapter = searchParams.get("chapter") || "";

  const loadNotes = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("wrong_notes")
        .select("*")
        .eq("is_resolved", false);

      if (subject) query = query.eq("subject_name", subject);
      if (book) query = query.eq("book_name", book);
      if (chapter) query = query.eq("chapter_name", chapter);

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading notes:", error);
        return;
      }

      setNotes(data || []);
    } catch (error) {
      console.error("Error loading notes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [subject, book, chapter]);

  const getBackPath = () => {
    if (chapter && book && subject) {
      return `/subject/${encodeURIComponent(subject)}/book/${encodeURIComponent(book)}`;
    }
    if (book && subject) {
      return `/subject/${encodeURIComponent(subject)}`;
    }
    if (subject) {
      return "/";
    }
    return "/notes";
  };

  const getTitle = () => {
    if (chapter && book && subject) {
      return `${subject} > ${book} > ${chapter} 복습`;
    }
    if (book && subject) {
      return `${subject} > ${book} 복습`;
    }
    if (subject) {
      return `${subject} 복습`;
    }
    return "오답노트 복습";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">복습 자료를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link to={getBackPath()}>
              <Button variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                뒤로
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">{getTitle()}</h1>
          </div>

          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">복습할 오답노트가 없습니다</h2>
              <p className="text-muted-foreground mb-6">
                아직 미해결된 오답노트가 없습니다. 새로운 오답노트를 추가해보세요.
              </p>
              <Link to="/notes">
                <Button>
                  <BookOpen className="h-4 w-4 mr-2" />
                  오답노트 보기
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to={getBackPath()}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              뒤로
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{getTitle()}</h1>
          <div className="ml-auto">
            <span className="text-sm text-muted-foreground">
              총 {notes.length}개 문제
            </span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="flashcard" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              플래시카드
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              퀴즈
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              진도추적
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              복습계획
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flashcard">
            <FlashCard notes={notes} onComplete={loadNotes} />
          </TabsContent>

          <TabsContent value="quiz">
            <Quiz notes={notes} onComplete={loadNotes} />
          </TabsContent>

          <TabsContent value="progress">
            <ProgressTracker 
              subject={subject} 
              book={book} 
              chapter={chapter} 
            />
          </TabsContent>

          <TabsContent value="schedule">
            <ReviewScheduler 
              subject={subject} 
              book={book} 
              chapter={chapter} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}