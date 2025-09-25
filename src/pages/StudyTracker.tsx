import React, { useState } from "react";
import { Folder, FolderOpen, Plus, BookOpen, ChevronDown, ChevronRight, RefreshCw, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudyTable } from "@/components/study/StudyTable";
import { EditableText } from "@/components/EditableText";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedData } from "@/contexts/UnifiedDataContext";

interface StudyData {
  id: string;
  subject: string;
  textbook: string;
  maxRounds: number;
  chapters: Chapter[];
  createdAt: Date;
}

interface Chapter {
  order: number;
  name: string;
  problems: Problem[];
}

interface Problem {
  number: number;
  rounds: { [roundNumber: number]: '⭕' | '🔺' | '❌' | null };
  hasNote: boolean;
}

interface SubjectFolder {
  name: string;
  books: BookFolder[];
  isExpanded: boolean;
}

interface BookFolder {
  name: string;
  studyData: StudyData;
  isExpanded: boolean;
}

export default function StudyTracker() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newTextbook, setNewTextbook] = useState("");
  const [maxRounds, setMaxRounds] = useState("");
  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = useState(false);
  const [selectedSubjectForBook, setSelectedSubjectForBook] = useState("");
  const [newBookName, setNewBookName] = useState("");
  const [newBookMaxRounds, setNewBookMaxRounds] = useState("");
  
  // 단원 삭제 관련 state
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<{subject: string, book: string, chapter: string} | null>(null);
  
  // Navigation state for hierarchical folder structure
  const [currentView, setCurrentView] = useState<'subjects' | 'books' | 'study'>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedBook, setSelectedBook] = useState<string>("");
  
  const { 
    subjects, 
    loading,
    addSubject,
    addBook,
    updateBook,
    refreshSubjects,
    toggleSubjectExpansion,
    toggleBookExpansion,
    updateStudyProgress,
    getSubjectNames,
    deleteChapter
  } = useUnifiedData();

  // No longer need local state management - everything handled by UnifiedDataContext

  const handleCreateStudyPlan = async () => {
    if (!newSubject.trim() || !newTextbook.trim()) {
      toast({
        title: "오류",
        description: "과목명과 교재명을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (!maxRounds || parseInt(maxRounds) < 1) {
      toast({
        title: "오류",
        description: "회독 수를 입력해주세요. (1회 이상)",
        variant: "destructive"
      });
      return;
    }

    const maxRoundsNumber = parseInt(maxRounds);
    if (maxRoundsNumber > 10) {
      toast({
        title: "오류",
        description: "회독 수는 10회 이하여야 합니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      // First add subject if it doesn't exist
      const existingSubjects = getSubjectNames();
      if (!existingSubjects.includes(newSubject.trim())) {
        await addSubject(newSubject.trim());
      }

      // Add book with max rounds
      await addBook(newSubject.trim(), newTextbook.trim(), maxRoundsNumber);
      
      // 폼 초기화
      setNewSubject("");
      setNewTextbook("");
      setMaxRounds("");
      setIsCreateDialogOpen(false);
      
      // addSubject와 addBook에서 이미 성공/실패 토스트를 표시하므로 여기서는 제거
    } catch (error) {
      console.error('Error creating study plan:', error);
      // addSubject나 addBook에서 이미 오류 토스트를 표시하므로 여기서는 제거
    }
  };

  const handleAddBookToSubject = async (subjectName: string) => {
    setSelectedSubjectForBook(subjectName);
    setNewBookName("");
    setNewBookMaxRounds("3");
    setIsAddBookDialogOpen(true);
  };

  const handleCreateBookForSubject = async () => {
    if (!newBookName.trim()) {
      toast({
        title: "오류",
        description: "교재명을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (!newBookMaxRounds || parseInt(newBookMaxRounds) < 1) {
      toast({
        title: "오류",
        description: "회독 수를 입력해주세요. (1회 이상)",
        variant: "destructive"
      });
      return;
    }

    const maxRoundsNumber = parseInt(newBookMaxRounds);
    if (maxRoundsNumber > 10) {
      toast({
        title: "오류",
        description: "회독 수는 10회 이하여야 합니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Add book using UnifiedDataContext
      await addBook(selectedSubjectForBook, newBookName.trim(), maxRoundsNumber);
      
      setIsAddBookDialogOpen(false);
      setNewBookName("");
      setNewBookMaxRounds("");
      setSelectedSubjectForBook("");
    } catch (error) {
      console.error('Error adding book:', error);
      // UnifiedDataContext에서 이미 성공/실패 토스트를 표시하므로 여기서는 중복 토스트 방지
    }
  };

  const handleDeleteChapter = async (subjectName: string, bookName: string, chapterName: string) => {
    setChapterToDelete({ subject: subjectName, book: bookName, chapter: chapterName });
    setIsDeleteAlertOpen(true);
  };

  const confirmDeleteChapter = async () => {
    if (!chapterToDelete) return;
    
    try {
      await deleteChapter(chapterToDelete.subject, chapterToDelete.book, chapterToDelete.chapter);
      toast({
        title: "성공",
        description: "단원이 삭제되었습니다."
      });
    } catch (error) {
      console.error('Error deleting chapter:', error);
      toast({
        title: "오류",
        description: "단원 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsDeleteAlertOpen(false);
      setChapterToDelete(null);
    }
  };

  const handleUpdateBookName = async (oldBookName: string, newBookName: string) => {
    try {
      await updateBook(selectedSubject, oldBookName, newBookName);
      toast({
        title: "성공",
        description: `교재명이 "${newBookName}"으로 변경되었습니다.`
      });
      
      // 선택된 책 이름도 업데이트
      if (selectedBook === oldBookName) {
        setSelectedBook(newBookName);
      }
    } catch (error) {
      console.error('Error updating book name:', error);
      toast({
        title: "오류",
        description: "교재명 변경 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Re:Mind 회독표</h1>
            <p className="text-muted-foreground">과목별 교재를 체계적으로 관리하세요</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={refreshSubjects}
              className="mr-2"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              새로고침
            </Button>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  새 회독표 만들기
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>새 회독표 생성</DialogTitle>
                  <DialogDescription>
                    과목과 교재를 선택하고 단원별 문제 수를 입력하세요
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* 과목명 */}
                  <div>
                    <Label htmlFor="subject">과목명</Label>
                    <div className="space-y-2">
                       {/* 기존 과목 추천 */}
                       {getSubjectNames().length > 0 && (
                         <div className="flex flex-wrap gap-2">
                           {getSubjectNames().map((existingSubject) => (
                            <Button
                              key={existingSubject}
                              type="button"
                              variant={newSubject === existingSubject ? "default" : "outline"}
                              size="sm"
                              onClick={() => setNewSubject(existingSubject)}
                            >
                              {existingSubject}
                            </Button>
                          ))}
                        </div>
                      )}
                      {/* 직접 입력 */}
                      <Input
                        id="subject"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="새 과목명 입력 또는 위에서 선택"
                      />
                    </div>
                  </div>
                  
                  {/* 교재명 */}
                  <div>
                    <Label htmlFor="textbook">교재명</Label>
                    <Input
                      id="textbook"
                      value={newTextbook}
                      onChange={(e) => setNewTextbook(e.target.value)}
                      placeholder="예: 개념원리"
                    />
                  </div>
                  
                  {/* 회독 수 설정 */}
                  <div>
                    <Label htmlFor="maxRounds">회독 수</Label>
                    <Input
                      id="maxRounds"
                      value={maxRounds}
                      onChange={(e) => setMaxRounds(e.target.value)}
                      placeholder="회독 수를 입력하세요 (예: 3)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      최대 10회까지 설정 가능합니다
                    </p>
                  </div>
                  
                  <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                    💡 회독표 생성 후 단원을 추가할 수 있습니다
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      취소
                    </Button>
                    <Button onClick={handleCreateStudyPlan}>
                      생성하기
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 교재 추가 다이얼로그 */}
        <Dialog open={isAddBookDialogOpen} onOpenChange={setIsAddBookDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedSubjectForBook}에 교재 추가</DialogTitle>
              <DialogDescription>
                새로운 교재를 추가하고 회독표를 생성하세요
              </DialogDescription>
            </DialogHeader>
            
             <div className="space-y-4">
               <div>
                 <Label htmlFor="subjectSelect">과목 선택</Label>
                 <Select value={selectedSubjectForBook} onValueChange={setSelectedSubjectForBook}>
                   <SelectTrigger>
                     <SelectValue placeholder="과목을 선택하세요" />
                   </SelectTrigger>
                   <SelectContent>
                     {getSubjectNames().map(subject => (
                       <SelectItem key={subject} value={subject}>
                         {subject}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               
               <div>
                 <Label htmlFor="bookName">교재명</Label>
                 <Input
                   id="bookName"
                   value={newBookName}
                   onChange={(e) => setNewBookName(e.target.value)}
                   placeholder="예: 개념원리"
                 />
               </div>
               
               <div>
                 <Label htmlFor="bookMaxRounds">회독 수</Label>
                 <Input
                   id="bookMaxRounds"
                   value={newBookMaxRounds}
                   onChange={(e) => setNewBookMaxRounds(e.target.value)}
                   placeholder="회독 수를 입력하세요 (예: 3)"
                 />
                 <p className="text-xs text-muted-foreground mt-1">
                   최대 10회까지 설정 가능합니다
                 </p>
               </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddBookDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleCreateBookForSubject}>
                  추가하기
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Breadcrumb Navigation */}
        {(currentView === 'books' || currentView === 'study') && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setCurrentView('subjects')}
              className="p-0 h-auto hover:text-primary"
            >
              과목
            </Button>
            {currentView === 'books' && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium">{selectedSubject}</span>
              </>
            )}
            {currentView === 'study' && (
              <>
                <ChevronRight className="w-4 h-4" />
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCurrentView('books')}
                  className="p-0 h-auto hover:text-primary"
                >
                  {selectedSubject}
                </Button>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium">{selectedBook}</span>
              </>
            )}
          </div>
        )}

        {/* Content based on current view */}
        <div className="space-y-4">
          {currentView === 'subjects' && (
            <>
              {subjects.length === 0 ? (
                <Card className="p-8 text-center">
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">회독표가 없습니다</h3>
                  <p className="text-muted-foreground mb-4">
                    첫 번째 회독표를 만들어 공부를 시작해보세요!
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map((subject) => (
                    <Card 
                      key={subject.name} 
                      className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                      onClick={() => {
                        setSelectedSubject(subject.name);
                        setCurrentView('books');
                      }}
                    >
                      <CardContent className="p-6 text-center">
                        <Folder className="w-12 h-12 text-primary mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">{subject.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {subject.books.length}개 교재
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {currentView === 'books' && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foreground">{selectedSubject} 교재</h2>
                <Button 
                  variant="outline" 
                  onClick={() => handleAddBookToSubject(selectedSubject)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  교재 추가
                </Button>
              </div>
              
              {(() => {
                const subject = subjects.find(s => s.name === selectedSubject);
                if (!subject || subject.books.length === 0) {
                  return (
                    <Card className="p-8 text-center">
                      <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">교재가 없습니다</h3>
                      <p className="text-muted-foreground mb-4">
                        첫 번째 교재를 추가해서 회독표를 시작해보세요!
                      </p>
                      <Button onClick={() => handleAddBookToSubject(selectedSubject)}>
                        <Plus className="w-4 h-4 mr-2" />
                        교재 추가
                      </Button>
                    </Card>
                  );
                }
                
                return (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {subject.books.map((book) => (
                       <Card 
                         key={book.name} 
                         className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                         onClick={(e) => {
                           // EditableText의 편집 버튼 클릭 시에는 카드 클릭 이벤트 방지
                           if ((e.target as HTMLElement).closest('.editable-text-edit-mode') || 
                               (e.target as HTMLElement).closest('[data-editable-text]')) {
                             return;
                           }
                           
                           setSelectedBook(book.name);
                           setCurrentView('study');
                         }}
                       >
                         <CardContent className="p-6 text-center">
                           <BookOpen className="w-12 h-12 text-accent mx-auto mb-4" />
                           <h3 className="text-lg font-semibold text-foreground mb-2">
                             <EditableText
                               text={book.name}
                               onSave={(newBookName) => handleUpdateBookName(book.name, newBookName)}
                               className="inline-flex items-center justify-center w-full"
                               inputClassName="text-lg font-semibold text-center"
                               showEditIcon={true}
                             />
                           </h3>
                           <p className="text-sm text-muted-foreground">
                             {book.studyData.chapters.length}개 단원
                           </p>
                           <p className="text-xs text-muted-foreground mt-1">
                             최대 {book.studyData.maxRounds}회독
                           </p>
                           
                           {/* 단원 목록 및 삭제 버튼 */}
                           {book.studyData.chapters.length > 0 && (
                             <div className="mt-4 border-t pt-3">
                               <p className="text-xs text-muted-foreground mb-2">단원 목록:</p>
                               <div className="space-y-1">
                                 {book.studyData.chapters.map((chapter) => (
                                   <div key={chapter.name} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                                     <span className="truncate">{chapter.name}</span>
                                     <DropdownMenu>
                                       <DropdownMenuTrigger 
                                         className="p-1 hover:bg-muted/50 rounded"
                                         onClick={(e) => e.stopPropagation()}
                                       >
                                         <MoreVertical className="w-3 h-3" />
                                       </DropdownMenuTrigger>
                                       <DropdownMenuContent>
                                         <DropdownMenuItem 
                                           className="text-destructive"
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             handleDeleteChapter(selectedSubject, book.name, chapter.name);
                                           }}
                                         >
                                           <Trash2 className="w-4 h-4 mr-2" />
                                           단원 삭제
                                         </DropdownMenuItem>
                                       </DropdownMenuContent>
                                     </DropdownMenu>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}
                         </CardContent>
                       </Card>
                     ))}
                  </div>
                );
              })()}
            </>
          )}

          {currentView === 'study' && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foreground">{selectedBook} 회독표</h2>
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentView('books')}
                >
                  교재 목록으로 돌아가기
                </Button>
              </div>
              
              {(() => {
                const subject = subjects.find(s => s.name === selectedSubject);
                const book = subject?.books.find(b => b.name === selectedBook);
                
                if (!book) {
                  return (
                    <Card className="p-8 text-center">
                      <h3 className="text-lg font-semibold text-foreground mb-2">교재를 찾을 수 없습니다</h3>
                      <Button onClick={() => setCurrentView('books')}>
                        교재 목록으로 돌아가기
                      </Button>
                    </Card>
                  );
                }
                
                return (
                  <Card>
                    <CardContent className="p-6">
                      <StudyTable 
                        studyData={book.studyData}
                        onUpdateStudyData={(updatedData) => {
                          updateStudyProgress(selectedSubject, selectedBook, updatedData);
                        }}
                      />
                    </CardContent>
                  </Card>
                );
              })()}
            </>
          )}
        </div>
        
        {/* 단원 삭제 확인 다이얼로그 */}
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>단원 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                "{chapterToDelete?.chapter}" 단원을 삭제하시겠습니까?
                <br />
                <span className="text-destructive font-medium">
                  이 작업은 되돌릴 수 없으며, 해당 단원의 모든 데이터가 삭제됩니다.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteChapter}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}