import { useState, useEffect } from "react";
import { Plus, BookOpen, Calendar, Target, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface StudyProgress {
  id: string;
  subject_name: string;
  book_name: string;
  chapter_name: string;
  round_number: number;
  is_completed: boolean;
  completed_at?: string;
  target_date?: string;
  notes?: string;
  created_at: string;
}

interface Book {
  name: string;
  subject_name: string;
}

interface Chapter {
  name: string;
  book_name: string;
  subject_name: string;
}

export default function StudyPlan() {
  const [studyProgress, setStudyProgress] = useState<StudyProgress[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedBook, setSelectedBook] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [targetRounds, setTargetRounds] = useState(3);
  const [targetDate, setTargetDate] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load study progress
      const { data: progressData, error: progressError } = await supabase
        .from('study_progress')
        .select('*')
        .order('created_at', { ascending: false });

      if (progressError) throw progressError;

      // Load books
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('name, subject_name')
        .order('subject_name', { ascending: true });

      if (booksError) throw booksError;

      // Load chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('name, book_name, subject_name')
        .order('subject_name', { ascending: true });

      if (chaptersError) throw chaptersError;

      setStudyProgress(progressData || []);
      setBooks(booksData || []);
      setChapters(chaptersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('데이터 로드 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudyPlan = async () => {
    if (!selectedSubject || !selectedBook || !selectedChapter) {
      toast.error('모든 필드를 선택해주세요.');
      return;
    }

    try {
      // Create study progress entries for each round
      const studyPlans = Array.from({ length: targetRounds }, (_, index) => ({
        subject_name: selectedSubject,
        book_name: selectedBook,
        chapter_name: selectedChapter,
        round_number: index + 1,
        target_date: targetDate || null
      }));

      const { error } = await supabase
        .from('study_progress')
        .insert(studyPlans);

      if (error) throw error;

      // Create chapter if it doesn't exist
      const { error: chapterError } = await supabase
        .from('chapters')
        .upsert({
          name: selectedChapter,
          book_name: selectedBook,
          subject_name: selectedSubject
        }, {
          onConflict: 'name,book_name,subject_name'
        });

      if (chapterError) console.warn('Chapter creation error:', chapterError);

      toast.success('학습 계획이 추가되었습니다.');
      setIsDialogOpen(false);
      loadData();
      
      // Reset form
      setSelectedSubject("");
      setSelectedBook("");
      setSelectedChapter("");
      setTargetRounds(3);
      setTargetDate("");
    } catch (error) {
      console.error('Error adding study plan:', error);
      toast.error('학습 계획 추가 중 오류가 발생했습니다.');
    }
  };

  const toggleCompletion = async (id: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('study_progress')
        .update({
          is_completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(isCompleted ? '완료를 취소했습니다.' : '회독을 완료했습니다.');
      loadData();
    } catch (error) {
      console.error('Error updating completion:', error);
      toast.error('상태 업데이트 중 오류가 발생했습니다.');
    }
  };

  const getUniqueSubjects = () => {
    return [...new Set(books.map(book => book.subject_name))];
  };

  const getBooksBySubject = (subject: string) => {
    return books.filter(book => book.subject_name === subject);
  };

  const getChaptersByBook = (subject: string, book: string) => {
    return chapters.filter(chapter => 
      chapter.subject_name === subject && chapter.book_name === book
    );
  };

  const groupedProgress = studyProgress.reduce((acc, progress) => {
    const key = `${progress.subject_name}_${progress.book_name}_${progress.chapter_name}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(progress);
    return acc;
  }, {} as Record<string, StudyProgress[]>);

  const calculateProgress = (rounds: StudyProgress[]) => {
    const completed = rounds.filter(r => r.is_completed).length;
    return (completed / rounds.length) * 100;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">회독표</h1>
          <p className="text-muted-foreground">학습 진도를 체계적으로 관리하세요</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              학습 계획 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 학습 계획 추가</DialogTitle>
              <DialogDescription>
                과목, 교재, 단원을 선택하고 목표 회독수를 설정하세요.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">과목</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="과목을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {getUniqueSubjects().map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSubject && (
                <div>
                  <Label htmlFor="book">교재</Label>
                  <Select value={selectedBook} onValueChange={setSelectedBook}>
                    <SelectTrigger>
                      <SelectValue placeholder="교재를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {getBooksBySubject(selectedSubject).map((book) => (
                        <SelectItem key={book.name} value={book.name}>
                          {book.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedBook && (
                <div>
                  <Label htmlFor="chapter">단원</Label>
                  <Select value={selectedChapter} onValueChange={setSelectedChapter}>
                    <SelectTrigger>
                      <SelectValue placeholder="단원을 선택하거나 새로 입력하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {getChaptersByBook(selectedSubject, selectedBook).map((chapter) => (
                        <SelectItem key={chapter.name} value={chapter.name}>
                          {chapter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input 
                    className="mt-2" 
                    placeholder="새 단원명을 입력하세요"
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="rounds">목표 회독수</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={targetRounds}
                  onChange={(e) => setTargetRounds(parseInt(e.target.value) || 1)}
                />
              </div>

              <div>
                <Label htmlFor="target-date">목표 완료일 (선택)</Label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>

              <Button onClick={handleAddStudyPlan} className="w-full">
                학습 계획 추가
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Study Progress Cards */}
      <div className="space-y-6">
        {Object.entries(groupedProgress).length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">학습 계획이 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                첫 번째 학습 계획을 추가해보세요
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                학습 계획 추가
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedProgress).map(([key, rounds]) => {
            const [subject, book, chapter] = key.split('_');
            const progress = calculateProgress(rounds);
            const completedRounds = rounds.filter(r => r.is_completed).length;
            const totalRounds = rounds.length;

            return (
              <Card key={key}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        {chapter}
                      </CardTitle>
                      <CardDescription>
                        {subject} • {book}
                      </CardDescription>
                    </div>
                    <Link 
                      to={`/notes/${encodeURIComponent(subject)}/${encodeURIComponent(book)}/${encodeURIComponent(chapter)}`}
                    >
                      <Button variant="outline" size="sm">
                        오답노트
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>진도율</span>
                        <span>{completedRounds}/{totalRounds} 회독</span>
                      </div>
                      <Progress value={progress} />
                    </div>

                    {/* Round Checkboxes */}
                    <div className="flex flex-wrap gap-2">
                      {rounds
                        .sort((a, b) => a.round_number - b.round_number)
                        .map((round) => (
                          <button
                            key={round.id}
                            onClick={() => toggleCompletion(round.id, round.is_completed)}
                            className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent transition-colors"
                          >
                            {round.is_completed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <Circle className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">
                              {round.round_number}회독
                            </span>
                            {round.completed_at && (
                              <Badge variant="secondary" className="text-xs">
                                {new Date(round.completed_at).toLocaleDateString()}
                              </Badge>
                            )}
                          </button>
                        ))}
                    </div>

                    {/* Target Date */}
                    {rounds[0]?.target_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        목표: {new Date(rounds[0].target_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}