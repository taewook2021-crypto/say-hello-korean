import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, ChevronDown, ChevronRight, Plus, BookOpen, Settings } from "lucide-react";
import { CreateWrongNoteDialog } from "./CreateWrongNoteDialog";
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

interface StudyTableProps {
  studyData: StudyData;
  onUpdateStudyData: (updatedData: StudyData) => void;
}

export function StudyTable({ studyData, onUpdateStudyData }: StudyTableProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set([1])); // 첫 번째 단원은 기본 확장
  const [isWrongNoteDialogOpen, setIsWrongNoteDialogOpen] = useState(false);
  const [isWrongNoteConfirmOpen, setIsWrongNoteConfirmOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<{
    chapterOrder: number;
    problemNumber: number;
    status: '🔺' | '❌';
  } | null>(null);
  const [isAddChapterDialogOpen, setIsAddChapterDialogOpen] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [newChapterProblemCount, setNewChapterProblemCount] = useState("");
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [newMaxRounds, setNewMaxRounds] = useState(studyData.maxRounds || 3);

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
        status
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

  const handleAddChapter = () => {
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

    const updatedStudyData = {
      ...studyData,
      chapters: [...studyData.chapters, newChapter]
    };

    onUpdateStudyData(updatedStudyData);
    
    // 새 단원을 확장 상태로 설정
    setExpandedChapters(prev => new Set([...prev, newChapter.order]));
    
    // 폼 초기화
    setNewChapterName("");
    setNewChapterProblemCount("");
    setIsAddChapterDialogOpen(false);
    
    toast.success(`${newChapterName.trim()} 단원이 추가되었습니다!`);
  };

  const handleUpdateMaxRounds = () => {
    if (newMaxRounds < 1) {
      toast.error("회독 수는 1회 이상이어야 합니다.");
      return;
    }

    if (newMaxRounds > 10) {
      toast.error("회독 수는 10회 이하여야 합니다.");
      return;
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

    // 회독 수가 감소하는 경우 해당 회독 데이터 제거
    const updatedChapters = studyData.chapters.map(chapter => ({
      ...chapter,
      problems: chapter.problems.map(problem => {
        const currentRounds = problem.rounds || {};
        const newRounds = { ...currentRounds };
        // 새로운 최대 회독 수를 초과하는 회독 데이터 삭제
        for (let round = newMaxRounds + 1; round <= (studyData.maxRounds || 3); round++) {
          delete newRounds[round];
        }
        return { ...problem, rounds: newRounds };
      })
    }));

    const updatedStudyData = {
      ...studyData,
      maxRounds: newMaxRounds,
      chapters: updatedChapters
    };

    onUpdateStudyData(updatedStudyData);
    setIsSettingsDialogOpen(false);
    
    toast.success(`회독 수가 ${newMaxRounds}회로 변경되었습니다.`);
  };

  // 챕터를 order 순으로 정렬 (순서 유지를 위해 중요!)
  const sortedChapters = [...studyData.chapters].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {/* 상단 버튼들 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">
          {studyData.subject} &gt; {studyData.textbook} (최대 {studyData.maxRounds || 3}회독)
        </h3>
        <div className="flex gap-2">
          <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                설정
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>회독표 설정</DialogTitle>
                <DialogDescription>
                  회독 수를 변경할 수 있습니다
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setNewMaxRounds(studyData.maxRounds || 3);
                    setIsSettingsDialogOpen(false);
                  }}>
                    취소
                  </Button>
                  <Button onClick={handleUpdateMaxRounds}>
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
                <span className="font-medium text-foreground">
                  {chapter.order}. {chapter.name}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {chapter.problems.length}문제
                </Badge>
              </div>
              
              {/* 진도율 표시 */}
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
                              <div className="flex justify-center">
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
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          {problem.hasNote ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              보기
                            </Button>
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
          onNoteCreated={() => handleWrongNoteCreated(selectedProblem.chapterOrder, selectedProblem.problemNumber)}
        />
      )}
    </div>
  );
}