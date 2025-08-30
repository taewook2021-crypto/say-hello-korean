import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Plus, ChevronRight, ChevronDown, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { TodayReviews } from "@/components/TodayReviews";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { User } from "lucide-react";


const Home = () => {
  const navigate = useNavigate();
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
  const [showAddChapterTypeDialog, setShowAddChapterTypeDialog] = useState(false);
  const [selectedSubjectForChapterType, setSelectedSubjectForChapterType] = useState("");
  const [selectedBookForChapterType, setSelectedBookForChapterType] = useState("");
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<'subject' | 'book' | 'major' | 'sub'>('major');
  const [deleteTargetId, setDeleteTargetId] = useState("");
  const [deleteTargetName, setDeleteTargetName] = useState("");
  
  // 편집 다이얼로그 상태
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTargetType, setEditTargetType] = useState<'subject' | 'book' | 'major' | 'sub'>('subject');
  const [editTargetId, setEditTargetId] = useState("");
  const [editTargetName, setEditTargetName] = useState("");
  const [newEditName, setNewEditName] = useState("");
  
  const { toast } = useToast();
  const isPremiumUser = false; // 인증 기능 제거됨

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

  async function toggleSubject(subject: string) {
    if (expandedSubject === subject) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(subject);
      await loadBooksForSubject(subject);
    }
  }

  async function addSubject() {
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
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">내 학습 공간</h2>
            <p className="text-muted-foreground">
              과목별로 체계적인 학습을 시작해보세요
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/pdf-annotator')}
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF 필기
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Today's Reviews Section */}
        <TodayReviews />

        {/* Subjects Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              {subjects.map((subject) => (
                <Card key={subject} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>{subject}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSubject(subject)}
                        >
                          {expandedSubject === subject ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {expandedSubject === subject && (
                      <div className="space-y-2">
                        {booksLoading[subject] ? (
                          <div className="animate-pulse">
                            <div className="h-4 bg-muted rounded mb-2"></div>
                            <div className="h-4 bg-muted rounded"></div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {subjectBooks[subject]?.map((book) => (
                              <div key={book}>
                                <Link
                                  to={`/book/${encodeURIComponent(subject)}/${encodeURIComponent(book)}`}
                                  className="flex items-center justify-between p-2 rounded hover:bg-muted group"
                                >
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{book}</span>
                                  </div>
                                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                              </div>
                            ))}
                            {(!subjectBooks[subject] || subjectBooks[subject].length === 0) && (
                              <p className="text-sm text-muted-foreground italic">
                                등록된 책이 없습니다
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Add Subject Card */}
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 hover:border-primary/50">
                    <CardContent className="flex flex-col items-center justify-center h-32">
                      <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">새 과목 추가</span>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 과목 추가</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="과목명을 입력하세요"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                    />
                    <div className="flex justify-end gap-2">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
