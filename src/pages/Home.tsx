import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BookOpen, Plus, Calendar, Search, ChevronRight, MoreVertical, Trash2, Edit, Upload, RefreshCw, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { TodayReviews } from "@/components/TodayReviews";
import { useToast } from "@/hooks/use-toast";

import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnifiedData } from "@/contexts/UnifiedDataContext";
import { useSearch } from "@/contexts/SearchContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { EditableText } from "@/components/EditableText";

const Home = () => {
  const navigate = useNavigate();
  const [newSubject, setNewSubject] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBook, setNewBook] = useState("");
  const [showAddBookDialog, setShowAddBookDialog] = useState(false);
  const [selectedSubjectForBook, setSelectedSubjectForBook] = useState("");
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [booksLoading, setBooksLoading] = useState<{[key: string]: boolean}>({});
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<'subject' | 'book'>('subject');
  const [deleteTargetId, setDeleteTargetId] = useState("");
  const [deleteTargetName, setDeleteTargetName] = useState("");
  const [isStudyMode, setIsStudyMode] = useState(false);
  
  const { toast } = useToast();
  const { subjects, loading, addSubject, deleteSubject, deleteBook, addBook, getBooksBySubject, getSubjectNames, updateSubject, updateBook, refreshSubjects } = useUnifiedData();
  const { isSearchActive, searchQuery, searchType, searchResults, clearSearch } = useSearch();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await refreshSubjects();
      toast({
        title: "데이터 새로고침 완료",
        description: "모든 데이터가 최신 상태로 업데이트되었습니다.",
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "데이터 새로고침에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };


  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <p className="text-foreground font-medium">데이터 로딩 중...</p>
            <p className="text-sm text-muted-foreground">과목 → 교재 → 단원</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const loadBooksForSubject = async (subjectName: string) => {
    // UnifiedData에서는 이미 책 정보가 있으므로 별도 로딩 불필요
    return;
  };

  async function toggleSubject(subject: string) {
    if (expandedSubject === subject) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(subject);
      await loadBooksForSubject(subject);
    }
  }

  async function handleAddSubject() {
    if (!newSubject.trim()) return;

    try {
      await addSubject(newSubject.trim());
      setNewSubject("");
      setShowAddDialog(false);
    } catch (error) {
      // Error already handled in context
    }
  }

  async function handleAddBook() {
    if (!newBook.trim() || !selectedSubjectForBook) return;

    try {
      await addBook(selectedSubjectForBook, newBook.trim());
      setNewBook("");
      setShowAddBookDialog(false);
      setSelectedSubjectForBook("");
    } catch (error) {
      // Error already handled in context
    }
  }

  const openAddBookDialog = (subjectName: string) => {
    setSelectedSubjectForBook(subjectName);
    setShowAddBookDialog(true);
  }

  const handleDeleteSubject = async (subjectName: string) => {
    try {
      await deleteSubject(subjectName);
      setShowDeleteConfirmDialog(false);
    } catch (error) {
      // Error already handled in context
    }
  };

  const handleDeleteBook = async (subjectName: string, bookName: string) => {
    try {
      await deleteBook(subjectName, bookName);
      setShowDeleteConfirmDialog(false);
    } catch (error) {
      // Error already handled in context
    }
  };

  const openDeleteDialog = (type: 'subject' | 'book', name: string, subjectName?: string) => {
    setDeleteTargetType(type);
    setDeleteTargetName(name);
    setDeleteTargetId(subjectName || ''); // Store subject name for book deletion
    setShowDeleteConfirmDialog(true);
  };

  return (
    <div className="w-full mx-auto p-4 md:p-8 max-w-none md:max-w-4xl">
      {/* Hero Section */}
      <div className="mb-8 md:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-4">
          <div className="flex items-center gap-3">
            {isMobile && <SidebarTrigger className="shrink-0" />}
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">내 학습 공간</h1>
              <p className="text-sm md:text-lg text-muted-foreground">
                체계적인 학습으로 성취를 만들어보세요
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? '새로고침 중...' : '데이터 새로고침'}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>


      {/* Search Results or Today's Reviews */}
      <div className="mb-12">
        {isSearchActive ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">검색 결과</h2>
                <p className="text-muted-foreground">
                  "{searchQuery}" ({searchType === 'subject' ? '과목' : searchType === 'book' ? '교재' : '단원'}) 검색 결과 {searchResults.length}개
                </p>
              </div>
              <Button variant="outline" onClick={clearSearch}>
                검색 초기화
              </Button>
            </div>
            
            {searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((note) => (
                  <div key={note.id} className="p-6 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {note.subject_name} • {note.book_name} • {note.chapter_name}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          note.is_resolved 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}>
                          {note.is_resolved ? "해결됨" : "미해결"}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-foreground text-sm mb-2">문제</h4>
                          <p className="text-foreground leading-relaxed">{note.question}</p>
                        </div>
                        
                        {note.explanation && (
                          <div>
                            <h4 className="font-medium text-foreground text-sm mb-2">해설</h4>
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{note.explanation}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="text-xs text-muted-foreground">
                          생성일: {new Date(note.created_at).toLocaleDateString("ko-KR")}
                        </div>
                        <Link 
                          to={`/subject/${encodeURIComponent(note.subject_name)}/book/${encodeURIComponent(note.book_name)}`}
                          className="text-sm text-primary hover:underline"
                        >
                          교재로 이동
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">검색 결과가 없습니다</h3>
                <p className="text-muted-foreground">다른 검색어로 시도해보세요.</p>
              </div>
            )}
          </div>
        ) : (
          <TodayReviews onStudyModeChange={setIsStudyMode} />
        )}
      </div>

      {/* Subjects Section - Hide when search is active or study mode is active */}
      {!isSearchActive && !isStudyMode && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-foreground">전체 과목</h2>
              <Button 
                onClick={() => setShowAddDialog(true)}
                size="sm"
                variant="outline"
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                새 과목
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">{subjects.length}개</span>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 p-6 border rounded-lg bg-muted/30">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium text-foreground">데이터 로딩 중...</p>
                  <p className="text-sm text-muted-foreground">과목 → 교재 → 단원</p>
                </div>
              </div>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg animate-pulse">
                  <div className="w-8 h-8 bg-muted rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-muted rounded w-1/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {subjects.map((subject) => (
                <div key={subject.name} className="group">
                  <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSubject(subject.name)}
                      className="p-1 h-8 w-8"
                    >
                      <ChevronRight 
                        className={`h-4 w-4 transition-transform ${
                          expandedSubject === subject.name ? 'rotate-90' : ''
                        }`} 
                      />
                    </Button>
                    
                    <div className="flex-1 min-w-0">
                      <EditableText
                        text={subject.name}
                        onSave={(newName) => updateSubject(subject.name, newName)}
                        className="font-medium text-foreground text-lg"
                        placeholder="과목명을 입력하세요"
                      />
                      <p className="text-sm text-muted-foreground">
                        {subject.books.length > 0 ? `${subject.books.length}개의 책` : '책을 추가해보세요'}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDeleteDialog('subject', subject.name)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <Link 
                        to={`/subject/${encodeURIComponent(subject.name)}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Expanded Books */}
                  {expandedSubject === subject.name && (
                    <div className="ml-12 mt-2 space-y-1">
                      {booksLoading[subject.name] ? (
                        <div className="space-y-2">
                          {Array.from({ length: 2 }).map((_, index) => (
                            <div key={index} className="h-8 bg-muted rounded animate-pulse"></div>
                          ))}
                        </div>
                      ) : (
                         <>
                           {subject.books?.map((book) => {
                             const bookName = typeof book === 'string' ? book : book.name;
                             const bookLink = `/subject/${encodeURIComponent(subject.name)}/book/${encodeURIComponent(bookName)}`;
                             console.log('Book link generated:', bookLink, 'for subject:', subject.name, 'book:', bookName);
                             return (
                             <div key={bookName} className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors group/book">
                               <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                               <div className="flex-1">
                                 <EditableText
                                   text={bookName}
                                   onSave={(newName) => updateBook(subject.name, bookName, newName)}
                                   className="text-sm text-foreground"
                                   placeholder="교재명을 입력하세요"
                                 />
                               </div>
                               <Link
                                 to={bookLink}
                                 className="text-xs text-primary hover:underline"
                               >
                                 이동
                               </Link>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover/book:opacity-100 transition-opacity">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                 <DropdownMenuContent align="end">
                                   <DropdownMenuItem onClick={() => openDeleteDialog('book', bookName, subject.name)}>
                                     <Trash2 className="h-3 w-3 mr-2" />
                                     삭제
                                   </DropdownMenuItem>
                                 </DropdownMenuContent>
                              </DropdownMenu>
                              <Link to={bookLink}>
                                <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover/book:opacity-100 transition-opacity" />
                              </Link>
                            </div>
                            );
                          })}
                          
                          {/* Add Book Button */}
                          <div className="p-3">
                            <Button 
                              onClick={() => openAddBookDialog(subject.name)}
                              variant="outline"
                              size="sm"
                              className="w-full h-8 text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              책 추가
                            </Button>
                          </div>
                          
                          {(!subject.books || subject.books.length === 0) && (
                            <p className="text-sm text-muted-foreground italic p-3">
                              등록된 책이 없습니다
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {subjects.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">아직 과목이 없어요</h3>
                  <p className="text-muted-foreground mb-4">첫 번째 과목을 추가해서 학습을 시작해보세요!</p>
                    <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    과목 추가하기
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Subject Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 과목 추가</DialogTitle>
            <DialogDescription>새로운 과목을 추가합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="과목명을 입력하세요"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  handleAddSubject();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                취소
              </Button>
              <Button onClick={handleAddSubject} disabled={!newSubject.trim()}>
                추가
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Book Dialog */}
      <Dialog open={showAddBookDialog} onOpenChange={setShowAddBookDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 책 추가 - {selectedSubjectForBook}</DialogTitle>
            <DialogDescription>{selectedSubjectForBook} 과목에 새로운 책을 추가합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="책 이름을 입력하세요"
              value={newBook}
              onChange={(e) => setNewBook(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  handleAddBook();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowAddBookDialog(false);
                setNewBook("");
                setSelectedSubjectForBook("");
              }}>
                취소
              </Button>
              <Button onClick={handleAddBook} disabled={!newBook.trim()}>
                추가
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTargetName}</strong> {deleteTargetType === 'subject' ? '과목' : '책'}을 삭제하면 관련된 모든 데이터가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteTargetType === 'subject') {
                  handleDeleteSubject(deleteTargetName);
                } else if (deleteTargetType === 'book') {
                  handleDeleteBook(deleteTargetId, deleteTargetName);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Home;