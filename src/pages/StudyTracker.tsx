import React, { useState, useEffect } from "react";
import { Folder, FolderOpen, Plus, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudyTable } from "@/components/study/StudyTable";
import { toast } from "sonner";

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
  const [subjects, setSubjects] = useState<SubjectFolder[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newTextbook, setNewTextbook] = useState("");
  const [maxRounds, setMaxRounds] = useState("");

  useEffect(() => {
    loadStudyData();
  }, []);

  const loadStudyData = () => {
    const savedData = localStorage.getItem('aro-study-data');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      // Convert dates back from strings
      const processedData = parsed.map((subject: any) => ({
        ...subject,
        books: subject.books.map((book: any) => ({
          ...book,
          studyData: {
            ...book.studyData,
            createdAt: new Date(book.studyData.createdAt)
          }
        }))
      }));
      setSubjects(processedData);
    }
  };

  const getExistingSubjects = (): string[] => {
    // 기존에 저장된 과목들 반환
    return subjects.map(s => s.name);
  };

  const saveStudyData = (data: SubjectFolder[]) => {
    localStorage.setItem('aro-study-data', JSON.stringify(data));
    setSubjects(data);
  };

  const toggleSubjectExpansion = (subjectName: string) => {
    const updated = subjects.map(subject => 
      subject.name === subjectName 
        ? { ...subject, isExpanded: !subject.isExpanded }
        : subject
    );
    saveStudyData(updated);
  };

  const toggleBookExpansion = (subjectName: string, bookName: string) => {
    const updated = subjects.map(subject => 
      subject.name === subjectName 
        ? {
            ...subject,
            books: subject.books.map(book =>
              book.name === bookName
                ? { ...book, isExpanded: !book.isExpanded }
                : book
            )
          }
        : subject
    );
    saveStudyData(updated);
  };

  const handleCreateStudyPlan = () => {
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

    // 빈 회독표 생성 (단원 없음)
    const newStudyData: StudyData = {
      id: Date.now().toString(),
      subject: newSubject.trim(),
      textbook: newTextbook.trim(),
      maxRounds: maxRoundsNumber,
      chapters: [], // 빈 배열로 시작
      createdAt: new Date()
    };

    let updatedSubjects = [...subjects];
    
    // 기존 과목이 있는지 확인
    const existingSubjectIndex = updatedSubjects.findIndex(s => s.name === newSubject.trim());
    
    if (existingSubjectIndex >= 0) {
      // 기존 과목에 새 교재 추가
      updatedSubjects[existingSubjectIndex].books.push({
        name: newTextbook.trim(),
        studyData: newStudyData,
        isExpanded: false
      });
    } else {
      // 새 과목 생성
      updatedSubjects.push({
        name: newSubject.trim(),
        books: [{
          name: newTextbook.trim(),
          studyData: newStudyData,
          isExpanded: false
        }],
        isExpanded: true
      });
    }

    saveStudyData(updatedSubjects);
    
    // 폼 초기화
    setNewSubject("");
    setNewTextbook("");
    setMaxRounds("");
    setIsCreateDialogOpen(false);
    
    toast.success("회독표가 생성되었습니다! 이제 단원을 추가해보세요.");
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
                    {getExistingSubjects().length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {getExistingSubjects().map((existingSubject) => (
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
                                  const updatedSubjects = subjects.map(s => 
                                    s.name === subject.name ? {
                                      ...s,
                                      books: s.books.map(b => 
                                        b.name === book.name ? { ...b, studyData: updatedData } : b
                                      )
                                    } : s
                                  );
                                  saveStudyData(updatedSubjects);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
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