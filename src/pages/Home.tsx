import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Plus, ChevronRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { TodayReviews } from "@/components/TodayReviews";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Home = () => {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSubject, setNewSubject] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [subjectBooks, setSubjectBooks] = useState<{[key: string]: string[]}>({});
  const [booksLoading, setBooksLoading] = useState<{[key: string]: boolean}>({});
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [bookMajorChapters, setBookMajorChapters] = useState<{[key: string]: any[]}>({});
  const [majorChaptersLoading, setMajorChaptersLoading] = useState<{[key: string]: boolean}>({});
  const [expandedMajorChapter, setExpandedMajorChapter] = useState<string | null>(null);
  const [majorChapterSubChapters, setMajorChapterSubChapters] = useState<{[key: string]: string[]}>({});
  const [subChaptersLoading, setSubChaptersLoading] = useState<{[key: string]: boolean}>({});
  
  // 다이얼로그 상태
  const [showAddBookDialog, setShowAddBookDialog] = useState(false);
  const [newBook, setNewBook] = useState("");
  const [selectedSubjectForBook, setSelectedSubjectForBook] = useState("");
  const [showAddMajorChapterDialog, setShowAddMajorChapterDialog] = useState(false);
  const [newMajorChapter, setNewMajorChapter] = useState("");
  const [selectedBookForMajorChapter, setSelectedBookForMajorChapter] = useState("");
  const [selectedSubjectForMajorChapter, setSelectedSubjectForMajorChapter] = useState("");
  const [showAddSubChapterDialog, setShowAddSubChapterDialog] = useState(false);
  const [newSubChapter, setNewSubChapter] = useState("");
  const [selectedMajorChapterForSubChapter, setSelectedMajorChapterForSubChapter] = useState("");
  
  const { toast } = useToast();

  useEffect(() => {
    loadSubjects();
  }, []);

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

  const loadBooksForSubject = async (subjectName: string) => {
    if (subjectBooks[subjectName]) return;
    
    setBooksLoading(prev => ({ ...prev, [subjectName]: true }));
    
    try {
      const { data, error } = await supabase
        .from('books')
        .select('name')
        .eq('subject_name', subjectName)
        .order('name');
      
      if (error) throw error;
      
      setSubjectBooks(prev => ({
        ...prev,
        [subjectName]: data?.map((book: any) => book.name) || []
      }));
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setBooksLoading(prev => ({ ...prev, [subjectName]: false }));
    }
  };

  const loadMajorChaptersForBook = async (subjectName: string, bookName: string) => {
    const bookKey = `${subjectName}|${bookName}`;
    if (bookMajorChapters[bookKey]) return;
    
    setMajorChaptersLoading(prev => ({ ...prev, [bookKey]: true }));
    
    try {
      const { data, error } = await supabase
        .from('major_chapters')
        .select('id, name')
        .eq('subject_name', subjectName)
        .eq('book_name', bookName)
        .order('name');
      
      if (error) throw error;
      
      setBookMajorChapters(prev => ({
        ...prev,
        [bookKey]: data || []
      }));
    } catch (error) {
      console.error('Error loading major chapters:', error);
    } finally {
      setMajorChaptersLoading(prev => ({ ...prev, [bookKey]: false }));
    }
  };

  const loadSubChaptersForMajorChapter = async (majorChapterId: string) => {
    if (majorChapterSubChapters[majorChapterId]) return;
    
    setSubChaptersLoading(prev => ({ ...prev, [majorChapterId]: true }));
    
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('name')
        .eq('major_chapter_id', majorChapterId)
        .order('name');
      
      if (error) throw error;
      
      setMajorChapterSubChapters(prev => ({
        ...prev,
        [majorChapterId]: data?.map((chapter: any) => chapter.name) || []
      }));
    } catch (error) {
      console.error('Error loading sub chapters:', error);
    } finally {
      setSubChaptersLoading(prev => ({ ...prev, [majorChapterId]: false }));
    }
  };

  const toggleSubject = async (subjectName: string) => {
    if (expandedSubject === subjectName) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(subjectName);
      await loadBooksForSubject(subjectName);
    }
  };

  const toggleBook = async (subjectName: string, bookName: string) => {
    const bookKey = `${subjectName}|${bookName}`;
    if (expandedBook === bookKey) {
      setExpandedBook(null);
    } else {
      setExpandedBook(bookKey);
      await loadMajorChaptersForBook(subjectName, bookName);
    }
  };

  const toggleMajorChapter = async (majorChapterId: string) => {
    if (expandedMajorChapter === majorChapterId) {
      setExpandedMajorChapter(null);
    } else {
      setExpandedMajorChapter(majorChapterId);
      await loadSubChaptersForMajorChapter(majorChapterId);
    }
  };

  const addSubject = async () => {
    if (!newSubject.trim()) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .insert({ name: newSubject.trim() });

      if (error) throw error;

      setSubjects([...subjects, newSubject.trim()]);
      setNewSubject("");
      setShowAddDialog(false);
      
      toast({
        title: "과목 추가됨",
        description: `${newSubject} 과목이 추가되었습니다.`,
      });
    } catch (error) {
      console.error('Error adding subject:', error);
      toast({
        title: "오류",
        description: "과목 추가에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const addBook = async () => {
    if (!newBook.trim() || !selectedSubjectForBook) return;

    try {
      const { error } = await supabase
        .from('books')
        .insert({ 
          name: newBook.trim(),
          subject_name: selectedSubjectForBook
        });

      if (error) throw error;

      setSubjectBooks(prev => ({
        ...prev,
        [selectedSubjectForBook]: [...(prev[selectedSubjectForBook] || []), newBook.trim()]
      }));
      
      setNewBook("");
      setShowAddBookDialog(false);
      setSelectedSubjectForBook("");
      
      toast({
        title: "책 추가됨",
        description: `${newBook} 책이 추가되었습니다.`,
      });
    } catch (error) {
      console.error('Error adding book:', error);
      toast({
        title: "오류",
        description: "책 추가에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const openAddBookDialog = (subjectName: string) => {
    setSelectedSubjectForBook(subjectName);
    setShowAddBookDialog(true);
  };

  const addMajorChapter = async () => {
    if (!newMajorChapter.trim() || !selectedSubjectForMajorChapter || !selectedBookForMajorChapter) return;

    try {
      const { data, error } = await supabase
        .from('major_chapters')
        .insert({ 
          name: newMajorChapter.trim(),
          subject_name: selectedSubjectForMajorChapter,
          book_name: selectedBookForMajorChapter
        })
        .select()
        .single();

      if (error) throw error;

      const bookKey = `${selectedSubjectForMajorChapter}|${selectedBookForMajorChapter}`;
      setBookMajorChapters(prev => ({
        ...prev,
        [bookKey]: [...(prev[bookKey] || []), data]
      }));
      
      setNewMajorChapter("");
      setShowAddMajorChapterDialog(false);
      setSelectedSubjectForMajorChapter("");
      setSelectedBookForMajorChapter("");
      
      toast({
        title: "대단원 추가됨",
        description: `${newMajorChapter} 대단원이 추가되었습니다.`,
      });
    } catch (error) {
      console.error('Error adding major chapter:', error);
      toast({
        title: "오류",
        description: "대단원 추가에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const openAddMajorChapterDialog = (subjectName: string, bookName: string) => {
    setSelectedSubjectForMajorChapter(subjectName);
    setSelectedBookForMajorChapter(bookName);
    setShowAddMajorChapterDialog(true);
  };

  const addSubChapter = async () => {
    if (!newSubChapter.trim() || !selectedMajorChapterForSubChapter) return;

    // 대단원 정보를 가져와서 subject_name과 book_name을 알아냄
    try {
      const { data: majorChapterData, error: majorChapterError } = await supabase
        .from('major_chapters')
        .select('subject_name, book_name')
        .eq('id', selectedMajorChapterForSubChapter)
        .single();

      if (majorChapterError) throw majorChapterError;

      const { error } = await supabase
        .from('chapters')
        .insert({ 
          name: newSubChapter.trim(),
          subject_name: majorChapterData.subject_name,
          book_name: majorChapterData.book_name,
          major_chapter_id: selectedMajorChapterForSubChapter
        });

      if (error) throw error;

      setMajorChapterSubChapters(prev => ({
        ...prev,
        [selectedMajorChapterForSubChapter]: [...(prev[selectedMajorChapterForSubChapter] || []), newSubChapter.trim()]
      }));
      
      setNewSubChapter("");
      setShowAddSubChapterDialog(false);
      setSelectedMajorChapterForSubChapter("");
      
      toast({
        title: "소단원 추가됨",
        description: `${newSubChapter} 소단원이 추가되었습니다.`,
      });
    } catch (error) {
      console.error('Error adding sub chapter:', error);
      toast({
        title: "오류",
        description: "소단원 추가에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const openAddSubChapterDialog = (majorChapterId: string) => {
    setSelectedMajorChapterForSubChapter(majorChapterId);
    setShowAddSubChapterDialog(true);
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

        {/* 과목 선택 섹션 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                과목 선택
              </CardTitle>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    과목 추가
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 과목 추가</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="과목명을 입력하세요 (예: 세법)"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        취소
                      </Button>
                      <Button onClick={addSubject} disabled={!newSubject.trim()}>
                        추가
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      과목 추가하기
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 과목 추가</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="과목명을 입력하세요 (예: 세법)"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                          취소
                        </Button>
                        <Button onClick={addSubject} disabled={!newSubject.trim()}>
                          추가
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
          ) : (
            <div className="space-y-2">
              {subjects.map((subject, index) => (
                <div key={index} className="border rounded-lg">
                  <div 
                    className="flex items-center justify-between p-4 hover:bg-accent transition-colors cursor-pointer group"
                    onClick={() => toggleSubject(subject)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      <span className="text-lg font-medium">{subject}</span>
                    </div>
                    {expandedSubject === subject ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </div>
                  
                  {expandedSubject === subject && (
                    <div className="px-4 pb-4 border-t bg-muted/20">
                      <div className="py-2">
                        <span className="text-sm font-medium text-muted-foreground">책 목록</span>
                      </div>
                      {booksLoading[subject] ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, idx) => (
                            <div key={idx} className="h-8 bg-muted rounded animate-pulse" />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {subjectBooks[subject]?.map((book, bookIndex) => {
                            const bookKey = `${subject}|${book}`;
                            return (
                              <div key={bookIndex} className="border rounded-md ml-4">
                                <div 
                                  className="flex items-center justify-between p-2 hover:bg-accent transition-colors cursor-pointer group"
                                  onClick={() => toggleBook(subject, book)}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-secondary rounded-full"></div>
                                    <span className="text-sm">{book}</span>
                                  </div>
                                  {expandedBook === bookKey ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                  )}
                                </div>
                                
                                {expandedBook === bookKey && (
                                  <div className="px-2 pb-2 border-t bg-muted/10">
                                    <div className="flex items-center justify-between py-1">
                                      <span className="text-xs text-muted-foreground">대단원 목록</span>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => openAddMajorChapterDialog(subject, book)}
                                        className="h-4 w-4 p-0"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    {majorChaptersLoading[bookKey] ? (
                                      <div className="py-2">
                                        <div className="space-y-1">
                                          {Array.from({ length: 2 }).map((_, idx) => (
                                            <div key={idx} className="h-6 bg-muted rounded animate-pulse" />
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="py-1 space-y-1">
                                        {bookMajorChapters[bookKey]?.map((majorChapter, mcIndex) => (
                                          <div key={mcIndex} className="border rounded-sm ml-2">
                                            <div 
                                              className="flex items-center justify-between p-1 hover:bg-accent transition-colors cursor-pointer group"
                                              onClick={() => toggleMajorChapter(majorChapter.id)}
                                            >
                                              <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                                                <span className="text-xs font-medium">{majorChapter.name}</span>
                                              </div>
                                              {expandedMajorChapter === majorChapter.id ? (
                                                <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                              ) : (
                                                <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                              )}
                                            </div>
                                            
                                            {expandedMajorChapter === majorChapter.id && (
                                              <div className="px-1 pb-1 border-t bg-muted/5">
                                                <div className="flex items-center justify-between py-1">
                                                  <span className="text-xs text-muted-foreground">소단원 목록</span>
                                                  <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    onClick={() => openAddSubChapterDialog(majorChapter.id)}
                                                    className="h-3 w-3 p-0"
                                                  >
                                                    <Plus className="h-2 w-2" />
                                                  </Button>
                                                </div>
                                                {subChaptersLoading[majorChapter.id] ? (
                                                  <div className="py-1">
                                                    <div className="space-y-1">
                                                      {Array.from({ length: 2 }).map((_, idx) => (
                                                        <div key={idx} className="h-4 bg-muted rounded animate-pulse" />
                                                      ))}
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="space-y-1">
                                                    {majorChapterSubChapters[majorChapter.id]?.map((subChapter, scIndex) => (
                                                      <Link 
                                                        key={scIndex} 
                                                        to={`/notes/${encodeURIComponent(subject)}/${encodeURIComponent(book)}/${encodeURIComponent(subChapter)}`}
                                                        className="block"
                                                      >
                                                        <div className="flex items-center gap-1 p-1 rounded hover:bg-accent transition-colors cursor-pointer ml-2">
                                                          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                                                          <span className="text-xs">{subChapter}</span>
                                                        </div>
                                                      </Link>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* 책 추가 버튼 */}
                          <div className="mt-2 flex">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => openAddBookDialog(subject)}
                              className="h-6 w-6 p-0 border border-dashed ml-4"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </CardContent>
        </Card>

        {/* 다이얼로그들 */}
        
        {/* 책 추가 다이얼로그 */}
        <Dialog open={showAddBookDialog} onOpenChange={setShowAddBookDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 책 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="책명을 입력하세요 (예: 오정화 연습서)"
                value={newBook}
                onChange={(e) => setNewBook(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addBook()}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddBookDialog(false)}>
                  취소
                </Button>
                <Button onClick={addBook} disabled={!newBook.trim()}>
                  추가
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 대단원 추가 다이얼로그 */}
        <Dialog open={showAddMajorChapterDialog} onOpenChange={setShowAddMajorChapterDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 대단원 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="대단원명을 입력하세요 (예: 법인세, 소득세)"
                value={newMajorChapter}
                onChange={(e) => setNewMajorChapter(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addMajorChapter()}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddMajorChapterDialog(false)}>
                  취소
                </Button>
                <Button onClick={addMajorChapter} disabled={!newMajorChapter.trim()}>
                  추가
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 소단원 추가 다이얼로그 */}
        <Dialog open={showAddSubChapterDialog} onOpenChange={setShowAddSubChapterDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 소단원 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="소단원명을 입력하세요 (예: Ch 1, Ch 2)"
                value={newSubChapter}
                onChange={(e) => setNewSubChapter(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSubChapter()}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddSubChapterDialog(false)}>
                  취소
                </Button>
                <Button onClick={addSubChapter} disabled={!newSubChapter.trim()}>
                  추가
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Home;