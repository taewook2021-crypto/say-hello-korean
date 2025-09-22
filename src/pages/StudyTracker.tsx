import React, { useState } from "react";
import { Folder, FolderOpen, Plus, BookOpen, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudyTable } from "@/components/study/StudyTable";
import { toast } from "sonner";
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newTextbook, setNewTextbook] = useState("");
  const [maxRounds, setMaxRounds] = useState("");
  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = useState(false);
  const [selectedSubjectForBook, setSelectedSubjectForBook] = useState("");
  const [newBookName, setNewBookName] = useState("");
  const [newBookMaxRounds, setNewBookMaxRounds] = useState("");
  
  const { 
    subjects, 
    loading,
    addSubject,
    addBook, 
    refreshSubjects,
    toggleSubjectExpansion,
    toggleBookExpansion,
    updateStudyProgress,
    getSubjectNames
  } = useUnifiedData();

  // No longer need local state management - everything handled by UnifiedDataContext

  const handleCreateStudyPlan = async () => {
    if (!newSubject.trim() || !newTextbook.trim()) {
      toast.error("과목명과 교재명을 입력해주세요.");
      return;
    }

    if (!maxRounds || parseInt(maxRounds) < 1) {
      toast.error("회독 수를 입력해주세요. (1회 이상)");
      return;
    }

    const maxRoundsNumber = parseInt(maxRounds);
    if (maxRoundsNumber > 10) {
      toast.error("회독 수는 10회 이하여야 합니다.");
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
      
      toast.success("회독표가 생성되었습니다! 이제 단원을 추가해보세요.");
    } catch (error) {
      console.error('Error creating study plan:', error);
      toast.error("회독표 생성 중 오류가 발생했습니다.");
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
      toast.error("교재명을 입력해주세요.");
      return;
    }

    if (!newBookMaxRounds || parseInt(newBookMaxRounds) < 1) {
      toast.error("회독 수를 입력해주세요. (1회 이상)");
      return;
    }

    const maxRoundsNumber = parseInt(newBookMaxRounds);
    if (maxRoundsNumber > 10) {
      toast.error("회독 수는 10회 이하여야 합니다.");
      return;
    }

    try {
      // Add book using UnifiedDataContext
      await addBook(selectedSubjectForBook, newBookName.trim(), maxRoundsNumber);
      
      setIsAddBookDialogOpen(false);
      setNewBookName("");
      setNewBookMaxRounds("");
      setSelectedSubjectForBook("");
      
      toast.success("교재가 추가되었습니다!");
    } catch (error) {
      console.error('Error adding book:', error);
      toast.error("교재 추가 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">ARO 회독표</h1>
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

        {/* 폴더 구조 */}
        <div className="space-y-4">
          {subjects.length === 0 ? (
            <Card className="p-8 text-center">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">회독표가 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                첫 번째 회독표를 만들어 공부를 시작해보세요!
              </p>
            </Card>
          ) : (
            subjects.map((subject) => (
              <Card key={subject.name} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSubjectExpansion(subject.name)}
                >
                  <div className="flex items-center gap-2">
                    {subject.isExpanded ? (
                      <FolderOpen className="w-5 h-5 text-primary" />
                    ) : (
                      <Folder className="w-5 h-5 text-primary" />
                    )}
                    <CardTitle className="text-foreground">{subject.name}</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      ({subject.books.length}개 교재)
                    </span>
                    {subject.isExpanded ? (
                      <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                
                {subject.isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {subject.books.length === 0 ? (
                        <div className="text-center p-6 text-muted-foreground">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm mb-3">이 과목에 교재가 없습니다</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAddBookToSubject(subject.name)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            교재 추가
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-end mb-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleAddBookToSubject(subject.name)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              교재 추가
                            </Button>
                          </div>
                          {subject.books.map((book) => (
                            <div key={book.name} className="border border-border rounded-lg">
                              <div
                                className="p-3 cursor-pointer hover:bg-muted/30 transition-colors flex items-center gap-2"
                                onClick={() => toggleBookExpansion(subject.name, book.name)}
                              >
                                <BookOpen className="w-4 h-4 text-accent" />
                                <span className="font-medium text-foreground">{book.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  ({book.studyData.chapters.length}개 단원)
                                </span>
                                {book.isExpanded ? (
                                  <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                                )}
                              </div>
                              
                              {book.isExpanded && (
                                <div className="border-t border-border p-4">
                                   <StudyTable 
                                    studyData={book.studyData}
                                    onUpdateStudyData={(updatedData) => {
                                      updateStudyProgress(subject.name, book.name, updatedData);
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}