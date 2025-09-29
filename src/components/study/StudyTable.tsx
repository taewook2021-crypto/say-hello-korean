import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, ChevronDown, ChevronRight, Plus, BookOpen, Settings, X, Trash2, Info } from "lucide-react";
import { CreateWrongNoteDialog } from "./CreateWrongNoteDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedData } from "@/contexts/UnifiedDataContext";
import { EditableText } from "@/components/EditableText";
import { HtmlContent } from "@/components/ui/html-content";

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

interface StudyTableProps {
  studyData: StudyData;
  onUpdateStudyData: (updatedData: StudyData) => void;
}

export function StudyTable({ studyData, onUpdateStudyData }: StudyTableProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set([1])); // 첫 번째 단원은 기본 확장
  const { addChapter, deleteChapter, updateChapter, updateBook } = useUnifiedData();
  const [isWrongNoteDialogOpen, setIsWrongNoteDialogOpen] = useState(false);
  const [isWrongNoteConfirmOpen, setIsWrongNoteConfirmOpen] = useState(false);
  const [isWrongNoteViewOpen, setIsWrongNoteViewOpen] = useState(false);
  const [isWrongNoteSelectOpen, setIsWrongNoteSelectOpen] = useState(false);
  const [selectedWrongNote, setSelectedWrongNote] = useState<any>(null);
  const [availableWrongNotes, setAvailableWrongNotes] = useState<any[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<{
    chapterOrder: number;
    problemNumber: number;
    status: '🔺' | '❌';
    round: number; // 회독 번호 추가
  } | null>(null);
  const [isAddChapterDialogOpen, setIsAddChapterDialogOpen] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [newChapterProblemCount, setNewChapterProblemCount] = useState("");
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [newMaxRounds, setNewMaxRounds] = useState(studyData.maxRounds || 3);
  const [chapterProblemCounts, setChapterProblemCounts] = useState<{[chapterOrder: number]: string}>({});
  const [isDeleteChapterDialogOpen, setIsDeleteChapterDialogOpen] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);
  const [reviewCounts, setReviewCounts] = useState<{ [key: string]: number }>({});
  
  // 실시간 오답노트 및 복습 횟수 동기화
  useEffect(() => {
    const wrongNotesChannel = supabase
      .channel('wrong-notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모든 이벤트 감지
          schema: 'public',
          table: 'wrong_notes'
        },
        async (payload) => {
          console.log('Wrong note change detected:', payload);
          await syncWrongNoteStatus();
          await syncReviewCounts();
        }
      )
      .subscribe();

    const studySessionsChannel = supabase
      .channel('study-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_sessions'
        },
        async () => {
          await syncReviewCounts();
        }
      )
      .subscribe();

    // 컴포넌트 마운트 시 초기 동기화
    syncWrongNoteStatus();
    syncReviewCounts();

    return () => {
      supabase.removeChannel(wrongNotesChannel);
      supabase.removeChannel(studySessionsChannel);
    };
  }, [studyData.subject, studyData.textbook]);

  // 오답노트 상태 동기화 함수
  const syncWrongNoteStatus = async () => {
    try {
      // 현재 과목과 교재의 모든 오답노트 조회
      const { data: wrongNotes, error } = await supabase
        .from('wrong_notes')
        .select('chapter_name, source_text')
        .eq('subject_name', studyData.subject)
        .eq('book_name', studyData.textbook);

      if (error) {
        console.error('오답노트 동기화 오류:', error);
        return;
      }

      // 각 단원의 문제별 오답노트 존재 여부 맵 생성
      const wrongNoteMap = new Map<string, boolean>();
      wrongNotes?.forEach(note => {
        // source_text에서 문제 번호 추출 (예: "단원명 3번" -> 3)
        const match = note.source_text.match(/(\d+)번/);
        if (match) {
          const problemNumber = parseInt(match[1]);
          const key = `${note.chapter_name}-${problemNumber}`;
          wrongNoteMap.set(key, true);
        }
      });

      // 회독표 데이터의 hasNote 플래그 업데이트
      const updatedChapters = studyData.chapters.map(chapter => ({
        ...chapter,
        problems: chapter.problems.map(problem => {
          const key = `${chapter.name}-${problem.number}`;
          return {
            ...problem,
            hasNote: wrongNoteMap.has(key) || false
          };
        })
      }));

      // 변경사항이 있으면 업데이트
      const hasChanges = JSON.stringify(updatedChapters) !== JSON.stringify(studyData.chapters);
      if (hasChanges) {
        const updatedStudyData = {
          ...studyData,
          chapters: updatedChapters
        };
        onUpdateStudyData(updatedStudyData);
      }
    } catch (error) {
      console.error('오답노트 동기화 중 오류:', error);
    }
  };

  // 복습 횟수 동기화 함수
  const syncReviewCounts = async () => {
    try {
      const { data: reviewData, error } = await supabase
        .from('study_sessions')
        .select(`
          wrong_note_id,
          wrong_notes!inner(
            subject_name,
            book_name,
            chapter_name,
            source_text
          )
        `)
        .eq('wrong_notes.subject_name', studyData.subject)
        .eq('wrong_notes.book_name', studyData.textbook);

      if (error) {
        console.error('복습 횟수 동기화 오류:', error);
        return;
      }

      const countsMap: { [key: string]: number } = {};
      reviewData?.forEach((session: any) => {
        const note = session.wrong_notes;
        // source_text에서 문제 번호 추출 (예: "단원명 3번" -> 3)
        const match = note.source_text.match(/(\d+)번/);
        if (match) {
          const problemNumber = parseInt(match[1]);
          const key = `${note.chapter_name}-${problemNumber}`;
          countsMap[key] = (countsMap[key] || 0) + 1;
        }
      });

      setReviewCounts(countsMap);
    } catch (error) {
      console.error('복습 횟수 동기화 중 오류:', error);
    }
  };

  const toggleChapterExpansion = (chapterOrder: number) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterOrder)) {
      newExpanded.delete(chapterOrder);
    } else {
      newExpanded.add(chapterOrder);
    }
    setExpandedChapters(newExpanded);
  };

  const updateProblemStatus = (chapterOrder: number, problemNumber: number, roundNumber: number, status: '⭕' | '🔺' | '❌' | null) => {
    const updatedChapters = studyData.chapters.map(chapter => {
      if (chapter.order === chapterOrder) {
        return {
          ...chapter,
          problems: chapter.problems.map(problem => 
            problem.number === problemNumber ? { 
              ...problem, 
              rounds: { ...(problem.rounds || {}), [roundNumber]: status }
            } : problem
          )
        };
      }
      return chapter;
    });

    const updatedStudyData = {
      ...studyData,
      chapters: updatedChapters
    };

    onUpdateStudyData(updatedStudyData);

    // 🔺나 ❌ 선택시 오답노트 생성 여부 확인 다이얼로그 표시
    if (status === '🔺' || status === '❌') {
      setSelectedProblem({
        chapterOrder,
        problemNumber,
        status,
        round: roundNumber // 회독 번호 추가
      });
      setIsWrongNoteConfirmOpen(true);
    }
  };

  const handleWrongNoteCreated = (chapterOrder: number, problemNumber: number) => {
    // 오답노트가 생성되었음을 표시
    const updatedChapters = studyData.chapters.map(chapter => {
      if (chapter.order === chapterOrder) {
        return {
          ...chapter,
          problems: chapter.problems.map(problem => 
            problem.number === problemNumber ? { ...problem, hasNote: true } : problem
          )
        };
      }
      return chapter;
    });

    const updatedStudyData = {
      ...studyData,
      chapters: updatedChapters
    };

    onUpdateStudyData(updatedStudyData);
    setIsWrongNoteDialogOpen(false);
    setIsWrongNoteConfirmOpen(false);
    setSelectedProblem(null);
  };

  const handleAddChapter = async () => {
    if (!newChapterName.trim()) {
      toast.error("단원명을 입력해주세요.");
      return;
    }

    const problemCount = parseInt(newChapterProblemCount);
    if (!newChapterProblemCount.trim() || isNaN(problemCount) || problemCount < 1) {
      toast.error("문제 수를 올바르게 입력해주세요.");
      return;
    }

    // 새 단원의 order는 기존 단원들의 최대 order + 1
    const maxOrder = Math.max(0, ...studyData.chapters.map(ch => ch.order));
    const newChapter: Chapter = {
      order: maxOrder + 1,
      name: newChapterName.trim(),
      problems: Array.from({ length: problemCount }, (_, i) => ({
        number: i + 1,
        rounds: {}, // 빈 객체로 시작
        hasNote: false
      }))
    };

    // Use UnifiedDataContext to add chapter (handles both DB and local state)
    try {
      await addChapter(studyData.subject, studyData.textbook, newChapterName.trim());
      
      // Update local study data with the new chapter
      const updatedStudyData = {
        ...studyData,
        chapters: [...studyData.chapters, newChapter]
      };
      onUpdateStudyData(updatedStudyData);
    } catch (error) {
      console.error('Error adding chapter:', error);
    }
    
    // 새 단원을 확장 상태로 설정
    setExpandedChapters(prev => new Set([...prev, newChapter.order]));
    
    // 폼 초기화
    setNewChapterName("");
    setNewChapterProblemCount("");
    setIsAddChapterDialogOpen(false);
    
    toast.success(`${newChapterName.trim()} 단원이 추가되었습니다!`);
  };

  const handleUpdateSettings = () => {
    if (newMaxRounds < 1) {
      toast.error("회독 수는 1회 이상이어야 합니다.");
      return;
    }

    if (newMaxRounds > 10) {
      toast.error("회독 수는 10회 이하여야 합니다.");
      return;
    }

    // 문제 수 변경 검증
    for (const [chapterOrder, newProblemCountStr] of Object.entries(chapterProblemCounts)) {
      const newProblemCount = parseInt(newProblemCountStr);
      if (!newProblemCountStr.trim() || isNaN(newProblemCount) || newProblemCount < 1) {
        const chapter = studyData.chapters.find(ch => ch.order === parseInt(chapterOrder));
        toast.error(`${chapter?.name || '단원'}의 문제 수를 올바르게 입력해주세요.`);
        return;
      }
    }

    // 회독 수가 감소하는 경우, 해당 회독의 데이터 삭제 확인
    if (newMaxRounds < studyData.maxRounds) {
      const hasDataInRemovedRounds = studyData.chapters.some(chapter =>
        chapter.problems.some(problem => {
          if (!problem.rounds) return false;
          for (let round = newMaxRounds + 1; round <= (studyData.maxRounds || 3); round++) {
            if (problem.rounds[round]) return true;
          }
          return false;
        })
      );

      if (hasDataInRemovedRounds) {
        if (!confirm(`${newMaxRounds + 1}회독 이후의 데이터가 삭제됩니다. 계속하시겠습니까?`)) {
          return;
        }
      }
    }

    // 문제 수가 감소하는 경우, 해당 문제의 데이터 삭제 확인
    const problemCountChanges = Object.entries(chapterProblemCounts).filter(([chapterOrder, newCountStr]) => {
      const newCount = parseInt(newCountStr);
      const chapter = studyData.chapters.find(ch => ch.order === parseInt(chapterOrder));
      return chapter && !isNaN(newCount) && newCount < chapter.problems.length;
    });

    if (problemCountChanges.length > 0) {
      const hasDataInRemovedProblems = problemCountChanges.some(([chapterOrder, newCountStr]) => {
        const newCount = parseInt(newCountStr);
        const chapter = studyData.chapters.find(ch => ch.order === parseInt(chapterOrder));
        if (!chapter || isNaN(newCount)) return false;
        
        return chapter.problems.slice(newCount).some(problem => {
          if (!problem.rounds) return false;
          return Object.values(problem.rounds).some(status => status !== null);
        });
      });

      if (hasDataInRemovedProblems) {
        if (!confirm('문제 수를 줄이면 해당 문제들의 데이터가 삭제됩니다. 계속하시겠습니까?')) {
          return;
        }
      }
    }

    // 회독 수와 문제 수 업데이트
    const updatedChapters = studyData.chapters.map(chapter => {
      const newProblemCountStr = chapterProblemCounts[chapter.order];
      const newProblemCount = newProblemCountStr ? parseInt(newProblemCountStr) : chapter.problems.length;
      let updatedProblems = [...chapter.problems];

      // 문제 수 조정
      if (newProblemCount > chapter.problems.length) {
        // 문제 추가
        const additionalProblems = Array.from({ length: newProblemCount - chapter.problems.length }, (_, i) => ({
          number: chapter.problems.length + i + 1,
          rounds: {},
          hasNote: false
        }));
        updatedProblems = [...updatedProblems, ...additionalProblems];
      } else if (newProblemCount < chapter.problems.length) {
        // 문제 제거
        updatedProblems = updatedProblems.slice(0, newProblemCount);
      }

      // 회독 수가 감소하는 경우 해당 회독 데이터 제거
      updatedProblems = updatedProblems.map(problem => {
        const currentRounds = problem.rounds || {};
        const newRounds = { ...currentRounds };
        for (let round = newMaxRounds + 1; round <= (studyData.maxRounds || 3); round++) {
          delete newRounds[round];
        }
        return { ...problem, rounds: newRounds };
      });

      return {
        ...chapter,
        problems: updatedProblems
      };
    });

    const updatedStudyData = {
      ...studyData,
      maxRounds: newMaxRounds,
      chapters: updatedChapters
    };

    onUpdateStudyData(updatedStudyData);
    setIsSettingsDialogOpen(false);
    setChapterProblemCounts({});
    
    toast.success('설정이 변경되었습니다.');
  };

  const handleDeleteChapter = async () => {
    if (!chapterToDelete) return;
    
    try {
      // 1. 데이터베이스에서 단원과 관련된 모든 오답노트 삭제
      const { error: notesError } = await supabase
        .from('wrong_notes')
        .delete()
        .eq('subject_name', studyData.subject)
        .eq('book_name', studyData.textbook)
        .eq('chapter_name', chapterToDelete.name);

      if (notesError) {
        console.error('Error deleting wrong notes:', notesError);
      }

      // 2. 데이터베이스에서 단원 삭제
      const { error: chapterError } = await supabase
        .from('chapters')
        .delete()
        .eq('subject_name', studyData.subject)
        .eq('book_name', studyData.textbook)
        .eq('name', chapterToDelete.name);

      if (chapterError) {
        console.error('Error deleting chapter:', chapterError);
      }

      // 3. 회독표에서 단원 삭제
      const filteredChapters = studyData.chapters.filter(ch => ch.order !== chapterToDelete.order);
      
      // 삭제 후 order 재정렬
      const reorderedChapters = filteredChapters.map((chapter, index) => ({
        order: index + 1,
        name: chapter.name,
        problems: chapter.problems
      }));

      const updatedStudyData = {
        ...studyData,
        chapters: reorderedChapters
      };

      onUpdateStudyData(updatedStudyData);
      setIsDeleteChapterDialogOpen(false);
      setChapterToDelete(null);

      toast.success(`${chapterToDelete.name} 단원이 삭제되었습니다.`);
    } catch (error) {
      console.error('Error deleting chapter:', error);
      toast.error('단원 삭제 중 오류가 발생했습니다.');
    }
  };

  const openDeleteChapterDialog = (chapter: Chapter) => {
    setChapterToDelete(chapter);
    setIsDeleteChapterDialogOpen(true);
  };

  
  const handleViewWrongNote = async (chapterOrder: number, problemNumber: number) => {
    try {
      const chapter = studyData.chapters.find(ch => ch.order === chapterOrder);
      const chapterName = chapter?.name || "";

      // 데이터베이스에서 오답노트 찾기 - 모든 회독 고려
      const { data, error } = await supabase
        .from('wrong_notes')
        .select('*')
        .eq('subject_name', studyData.subject)
        .eq('book_name', studyData.textbook)
        .eq('chapter_name', chapterName)
        .ilike('source_text', `%${problemNumber}번%`)
        .order('round_number', { ascending: false }); // 최신 회독 우선

      if (error) {
        console.error('오답노트 조회 오류:', error);
        toast.error("오답노트를 불러올 수 없습니다.");
        return;
      }

      if (data && data.length > 0) {
        if (data.length === 1) {
          // 하나만 있으면 바로 열기
          setSelectedWrongNote(data[0]);
          setIsWrongNoteViewOpen(true);
        } else {
          // 여러개 있으면 선택 다이얼로그 열기
          setAvailableWrongNotes(data);
          setIsWrongNoteSelectOpen(true);
        }
      } else {
        // 데이터베이스에 없으면 로컬 스토리지에서 찾기
        const existingNotes = localStorage.getItem('aro-wrong-notes');
        const notes = existingNotes ? JSON.parse(existingNotes) : [];
        const foundNote = notes.find((note: any) => 
          note.subject === studyData.subject &&
          note.textbook === studyData.textbook &&
          note.chapter === chapterName &&
          note.problemNumber === problemNumber
        );

        if (foundNote) {
          setSelectedWrongNote(foundNote);
          setIsWrongNoteViewOpen(true);
        } else {
          toast.error("해당 문제의 오답노트를 찾을 수 없습니다.");
        }
      }
    } catch (error) {
      console.error('오답노트 보기 오류:', error);
      toast.error("오답노트를 불러올 수 없습니다.");
    }
  };

  const handleSelectWrongNote = (wrongNote: any) => {
    setSelectedWrongNote(wrongNote);
    setIsWrongNoteSelectOpen(false);
    setIsWrongNoteViewOpen(true);
  };

  // 챕터를 order 순으로 정렬 (순서 유지를 위해 중요!)
  const sortedChapters = [...studyData.chapters].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {/* 사용법 안내 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>사용법:</strong> 한 번 클릭 = ⭕ (완료), 길게 누르기 = 🔺 (부분완료), 더블 클릭 = ❌ (틀림)
        </AlertDescription>
      </Alert>

      {/* 상단 버튼들 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">
          {studyData.subject} &gt; <EditableText
            text={studyData.textbook}
            onSave={async (newBookName) => {
              try {
                await updateBook(studyData.subject, studyData.textbook, newBookName);
                onUpdateStudyData({
                  ...studyData,
                  textbook: newBookName
                });
                toast.success(`교재명이 "${newBookName}"으로 변경되었습니다.`);
              } catch (error) {
                console.error('Error updating book name:', error);
                toast.error("교재명 변경 중 오류가 발생했습니다.");
              }
            }}
            className="inline-flex items-center"
            inputClassName="text-lg font-semibold"
            showEditIcon={true}
          /> (최대 {studyData.maxRounds || 3}회독)
        </h3>
        <div className="flex gap-2">
          <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                설정
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>회독표 설정</DialogTitle>
                <DialogDescription>
                  회독 수와 각 단원의 문제 수를 변경할 수 있습니다
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="maxRounds">최대 회독 수</Label>
                  <Input
                    id="maxRounds"
                    value={(newMaxRounds || 3).toString()}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setNewMaxRounds(Math.max(1, Math.min(10, value)));
                    }}
                    placeholder="예: 3"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    현재: {studyData.maxRounds || 3}회 | 최대 10회까지 설정 가능
                  </p>
                  {newMaxRounds < (studyData.maxRounds || 3) && (
                    <p className="text-xs text-destructive mt-1">
                      ⚠️ 회독 수를 줄이면 해당 회독의 데이터가 삭제됩니다
                    </p>
                  )}
                </div>

                <div>
                  <Label>단원별 문제 수</Label>
                  <div className="space-y-3 mt-2">
                    {sortedChapters.map((chapter) => {
                      const currentCountStr = chapterProblemCounts[chapter.order] ?? chapter.problems.length.toString();
                      const currentCount = parseInt(currentCountStr) || chapter.problems.length;
                      return (
                        <div key={chapter.order} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                          <div className="flex-1">
                            <span className="font-medium text-sm">{chapter.order}. {chapter.name}</span>
                            <p className="text-xs text-muted-foreground">현재: {chapter.problems.length}문제</p>
                          </div>
                          <div className="w-24">
                            <Input
                              value={currentCountStr}
                              onChange={(e) => {
                                setChapterProblemCounts(prev => ({
                                  ...prev,
                                  [chapter.order]: e.target.value
                                }));
                              }}
                              placeholder="문제 수"
                              className="text-center"
                            />
                          </div>
                          {currentCount < chapter.problems.length && (
                            <p className="text-xs text-destructive">
                              ⚠️ 데이터 삭제됨
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setNewMaxRounds(studyData.maxRounds || 3);
                    setChapterProblemCounts({});
                    setIsSettingsDialogOpen(false);
                  }}>
                    취소
                  </Button>
                  <Button onClick={handleUpdateSettings}>
                    변경하기
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddChapterDialogOpen} onOpenChange={setIsAddChapterDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                단원 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 단원 추가</DialogTitle>
                <DialogDescription>
                  새로운 단원과 문제 수를 설정하세요
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="chapterName">단원명</Label>
                  <Input
                    id="chapterName"
                    value={newChapterName}
                    onChange={(e) => setNewChapterName(e.target.value)}
                    placeholder="예: 1단원 수와 연산"
                  />
                </div>
                <div>
                  <Label htmlFor="problemCount">문제 수</Label>
                  <Input
                    id="problemCount"
                    value={newChapterProblemCount}
                    onChange={(e) => setNewChapterProblemCount(e.target.value)}
                    placeholder="예: 30"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddChapterDialogOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleAddChapter}>
                    추가하기
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 단원 목록 */}
      {sortedChapters.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">단원이 없습니다</h3>
          <p className="text-muted-foreground mb-4">
            첫 번째 단원을 추가해서 회독을 시작해보세요!
          </p>
          <Button onClick={() => setIsAddChapterDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            단원 추가하기
          </Button>
        </div>
      ) : (
        sortedChapters.map((chapter) => (
          <div key={chapter.order} className="border border-border rounded-lg">
            {/* 단원 헤더 */}
            <div
              className="p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between"
              onClick={() => toggleChapterExpansion(chapter.order)}
            >
              <div className="flex items-center gap-2">
                {expandedChapters.has(chapter.order) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <span>{chapter.order}.</span>
                  <EditableText
                    text={chapter.name}
                    onSave={async (newName) => {
                      await updateChapter(studyData.subject, studyData.textbook, chapter.name, newName);
                      
                      // Update local study data
                      const updatedChapters = studyData.chapters.map(ch =>
                        ch.order === chapter.order ? { ...ch, name: newName } : ch
                      );
                      onUpdateStudyData({
                        ...studyData,
                        chapters: updatedChapters
                      });
                    }}
                    placeholder="단원명을 입력하세요"
                    className="flex-1"
                    showEditIcon={true}
                  />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {chapter.problems.length}문제
                </Badge>
              </div>
              
              {/* 진도율 표시와 삭제 버튼 */}
              <div className="flex items-center gap-2">
                {(() => {
                  const totalProblems = chapter.problems.length;
                  const maxRounds = studyData.maxRounds || 3;
                  let completedCount = 0;
                  let partialCount = 0;
                  let wrongCount = 0;
                  
                  // 모든 회독이 완료된 문제 수 계산
                  chapter.problems.forEach(problem => {
                    // rounds가 undefined일 경우 빈 객체로 초기화
                    if (!problem.rounds) {
                      problem.rounds = {};
                    }
                    
                    let allCompleted = true;
                    let hasAny = false;
                    let hasPartial = false;
                    let hasWrong = false;
                    
                    for (let round = 1; round <= maxRounds; round++) {
                      const status = problem.rounds[round];
                      if (status) {
                        hasAny = true;
                        if (status === '🔺') hasPartial = true;
                        if (status === '❌') hasWrong = true;
                        if (status !== '⭕') allCompleted = false;
                      } else {
                        allCompleted = false;
                      }
                    }
                    
                    if (allCompleted && hasAny) completedCount++;
                    else if (hasPartial) partialCount++;
                    else if (hasWrong) wrongCount++;
                  });
                  
                  const percentage = Math.round((completedCount / totalProblems) * 100);
                  
                  return (
                    <>
                      <span className="text-sm text-muted-foreground">
                        {completedCount}/{totalProblems} ({percentage}%)
                      </span>
                      <div className="flex gap-1">
                        {completedCount > 0 && <Badge className="text-xs bg-green-500">⭕{completedCount}</Badge>}
                        {partialCount > 0 && <Badge className="text-xs bg-yellow-500">🔺{partialCount}</Badge>}
                        {wrongCount > 0 && <Badge className="text-xs bg-red-500">❌{wrongCount}</Badge>}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 문제 테이블 */}
            {expandedChapters.has(chapter.order) && (
              <div className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-20">문제</TableHead>
                      {Array.from({ length: studyData.maxRounds || 3 }, (_, i) => (
                        <TableHead key={i + 1} className="text-center w-24">
                          {i + 1}회독
                        </TableHead>
                      ))}
                      <TableHead className="text-center w-32">오답노트</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chapter.problems.map((problem) => (
                      <TableRow key={problem.number}>
                        <TableCell className="text-center font-medium">
                          {problem.number}
                        </TableCell>
                        {Array.from({ length: studyData.maxRounds || 3 }, (_, roundIndex) => {
                          const roundNumber = roundIndex + 1;
                          const status = problem.rounds?.[roundNumber] || null;
                          
                          const handleStatusClick = (e: React.MouseEvent) => {
                            e.preventDefault();
                            updateProblemStatus(chapter.order, problem.number, roundNumber, '⭕');
                          };
                          
                          const handleStatusDoubleClick = (e: React.MouseEvent) => {
                            e.preventDefault();
                            updateProblemStatus(chapter.order, problem.number, roundNumber, '❌');
                          };
                          
                          const handleStatusLongPress = (e: React.MouseEvent) => {
                            e.preventDefault();
                            updateProblemStatus(chapter.order, problem.number, roundNumber, '🔺');
                          };
                          
                          // Long press 구현을 위한 상태
                          let pressTimer: NodeJS.Timeout | null = null;
                          let isLongPress = false;
                          
                          const handleMouseDown = (e: React.MouseEvent) => {
                            e.preventDefault();
                            isLongPress = false;
                            pressTimer = setTimeout(() => {
                              isLongPress = true;
                              handleStatusLongPress(e);
                            }, 500); // 500ms 후 long press로 인식
                          };
                          
                          const handleMouseUp = (e: React.MouseEvent) => {
                            e.preventDefault();
                            if (pressTimer) {
                              clearTimeout(pressTimer);
                              pressTimer = null;
                            }
                            
                            // Long press가 아닌 경우에만 click 이벤트 처리
                            if (!isLongPress) {
                              // 더블클릭 감지는 onDoubleClick에서 처리됨
                            }
                          };
                          
                          const getStatusStyle = () => {
                            switch (status) {
                              case '⭕':
                                return 'border-green-500 bg-green-50 text-green-700';
                              case '🔺':
                                return 'border-yellow-500 bg-yellow-50 text-yellow-700';
                              case '❌':
                                return 'border-red-500 bg-red-50 text-red-700';
                              default:
                                return 'border-border hover:border-primary';
                            }
                          };
                          
                          return (
                            <TableCell key={roundNumber} className="text-center">
                              <div className="flex justify-center relative">
                                <button
                                  onClick={handleStatusClick}
                                  onDoubleClick={handleStatusDoubleClick}
                                  onMouseDown={handleMouseDown}
                                  onMouseUp={handleMouseUp}
                                  onMouseLeave={() => {
                                    if (pressTimer) {
                                      clearTimeout(pressTimer);
                                      pressTimer = null;
                                    }
                                  }}
                                  className={`w-8 h-8 rounded border flex items-center justify-center text-sm transition-all select-none ${getStatusStyle()}`}
                                  title="클릭: ⭕, 길게누르기: 🔺, 더블클릭: ❌"
                                >
                                  {status || ''}
                                </button>
                                {status && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateProblemStatus(chapter.order, problem.number, roundNumber, null);
                                    }}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-muted-foreground/60 hover:bg-destructive text-white rounded-full flex items-center justify-center transition-colors"
                                    title="상태 삭제"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          {problem.hasNote ? (
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => handleViewWrongNote(chapter.order, problem.number)}
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                보기
                              </Button>
                              {(() => {
                                const key = `${chapter.name}-${problem.number}`;
                                const count = reviewCounts[key] || 0;
                                if (count > 0) {
                                  return (
                                    <span 
                                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        count <= 2 ? 'bg-orange-100 text-orange-700' :
                                        'bg-green-100 text-green-700'
                                      }`}
                                      title={`플래시카드 복습 ${count}회 완료`}
                                    >
                                      🔄 {count}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ))
      )}

      {/* 오답노트 생성 여부 확인 다이얼로그 */}
      {selectedProblem && (
        <Dialog open={isWrongNoteConfirmOpen} onOpenChange={setIsWrongNoteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>오답노트 생성</DialogTitle>
              <DialogDescription>
                {selectedProblem.chapterOrder}단원 {selectedProblem.problemNumber}번 문제에 대한 오답노트를 생성하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsWrongNoteConfirmOpen(false);
                setSelectedProblem(null);
              }}>
                아니요
              </Button>
              <Button onClick={() => {
                setIsWrongNoteConfirmOpen(false);
                setIsWrongNoteDialogOpen(true);
              }}>
                생성하기
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 오답노트 보기 다이얼로그 */}
      {selectedWrongNote && (
        <Dialog open={isWrongNoteViewOpen} onOpenChange={setIsWrongNoteViewOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                오답노트 보기
              </DialogTitle>
              <DialogDescription>
                {selectedWrongNote.subject_name || selectedWrongNote.subject} &gt; {selectedWrongNote.book_name || selectedWrongNote.textbook} &gt; {selectedWrongNote.chapter_name || selectedWrongNote.chapter}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">문제</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <HtmlContent 
                    content={selectedWrongNote.question || selectedWrongNote.content?.problemText || ''} 
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">정답 / 해설</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <HtmlContent 
                    content={selectedWrongNote.explanation || selectedWrongNote.content?.answer || ''} 
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setIsWrongNoteViewOpen(false)}>
                  닫기
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 오답노트 선택 다이얼로그 */}
      <Dialog open={isWrongNoteSelectOpen} onOpenChange={setIsWrongNoteSelectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>오답노트 선택</DialogTitle>
            <DialogDescription>
              해당 문제에 여러 회독의 오답노트가 있습니다. 보고 싶은 오답노트를 선택하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {availableWrongNotes.map((note, index) => (
              <Button
                key={note.id}
                variant="outline"
                className="w-full justify-between h-auto p-4"
                onClick={() => handleSelectWrongNote(note)}
              >
                <div className="text-left">
                  <div className="font-medium">
                    {note.round_number}회독 오답노트
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString('ko-KR')} 생성
                  </div>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsWrongNoteSelectOpen(false)}>
              취소
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 오답노트 작성 다이얼로그 */}
      {selectedProblem && (
        <CreateWrongNoteDialog
          isOpen={isWrongNoteDialogOpen}
          onClose={() => {
            setIsWrongNoteDialogOpen(false);
            setSelectedProblem(null);
          }}
          studyData={studyData}
          chapterOrder={selectedProblem.chapterOrder}
          problemNumber={selectedProblem.problemNumber}
          status={selectedProblem.status}
          round={selectedProblem.round} // 회독 번호 전달
          onNoteCreated={() => handleWrongNoteCreated(selectedProblem.chapterOrder, selectedProblem.problemNumber)}
        />
      )}
    </div>
  );
}