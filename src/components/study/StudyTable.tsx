import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronDown, ChevronRight } from "lucide-react";
import { CreateWrongNoteDialog } from "./CreateWrongNoteDialog";

interface StudyData {
  id: string;
  subject: string;
  textbook: string;
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
  status: '⭕' | '🔺' | '❌' | null;
  hasNote: boolean;
}

interface StudyTableProps {
  studyData: StudyData;
  onUpdateStudyData: (updatedData: StudyData) => void;
}

export function StudyTable({ studyData, onUpdateStudyData }: StudyTableProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set([1])); // 첫 번째 단원은 기본 확장
  const [isWrongNoteDialogOpen, setIsWrongNoteDialogOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<{
    chapterOrder: number;
    problemNumber: number;
    status: '🔺' | '❌';
  } | null>(null);

  const toggleChapterExpansion = (chapterOrder: number) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterOrder)) {
      newExpanded.delete(chapterOrder);
    } else {
      newExpanded.add(chapterOrder);
    }
    setExpandedChapters(newExpanded);
  };

  const updateProblemStatus = (chapterOrder: number, problemNumber: number, status: '⭕' | '🔺' | '❌' | null) => {
    const updatedChapters = studyData.chapters.map(chapter => {
      if (chapter.order === chapterOrder) {
        return {
          ...chapter,
          problems: chapter.problems.map(problem => 
            problem.number === problemNumber ? { ...problem, status } : problem
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

    // 🔺나 ❌ 선택시 오답노트 작성 다이얼로그 표시
    if (status === '🔺' || status === '❌') {
      setSelectedProblem({
        chapterOrder,
        problemNumber,
        status
      });
      setIsWrongNoteDialogOpen(true);
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
    setSelectedProblem(null);
  };

  // 챕터를 order 순으로 정렬 (순서 유지를 위해 중요!)
  const sortedChapters = [...studyData.chapters].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {sortedChapters.map((chapter) => (
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
                const completed = chapter.problems.filter(p => p.status === '⭕').length;
                const partial = chapter.problems.filter(p => p.status === '🔺').length;
                const wrong = chapter.problems.filter(p => p.status === '❌').length;
                const total = chapter.problems.length;
                const percentage = Math.round((completed / total) * 100);
                
                return (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {completed}/{total} ({percentage}%)
                    </span>
                    <div className="flex gap-1">
                      {completed > 0 && <Badge className="text-xs bg-green-500">⭕{completed}</Badge>}
                      {partial > 0 && <Badge className="text-xs bg-yellow-500">🔺{partial}</Badge>}
                      {wrong > 0 && <Badge className="text-xs bg-red-500">❌{wrong}</Badge>}
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
                    <TableHead className="text-center">상태</TableHead>
                    <TableHead className="text-center w-32">오답노트</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chapter.problems.map((problem) => (
                    <TableRow key={problem.number}>
                      <TableCell className="text-center font-medium">
                        {problem.number}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => updateProblemStatus(chapter.order, problem.number, '⭕')}
                            className={`w-8 h-8 rounded border-2 flex items-center justify-center text-lg transition-all ${
                              problem.status === '⭕' 
                                ? 'border-green-500 bg-green-50' 
                                : 'border-border hover:border-green-300'
                            }`}
                          >
                            {problem.status === '⭕' ? '⭕' : ''}
                          </button>
                          <button
                            onClick={() => updateProblemStatus(chapter.order, problem.number, '🔺')}
                            className={`w-8 h-8 rounded border-2 flex items-center justify-center text-lg transition-all ${
                              problem.status === '🔺' 
                                ? 'border-yellow-500 bg-yellow-50' 
                                : 'border-border hover:border-yellow-300'
                            }`}
                          >
                            {problem.status === '🔺' ? '🔺' : ''}
                          </button>
                          <button
                            onClick={() => updateProblemStatus(chapter.order, problem.number, '❌')}
                            className={`w-8 h-8 rounded border-2 flex items-center justify-center text-lg transition-all ${
                              problem.status === '❌' 
                                ? 'border-red-500 bg-red-50' 
                                : 'border-border hover:border-red-300'
                            }`}
                          >
                            {problem.status === '❌' ? '❌' : ''}
                          </button>
                          <button
                            onClick={() => updateProblemStatus(chapter.order, problem.number, null)}
                            className="w-8 h-8 rounded border-2 border-border hover:border-muted-foreground flex items-center justify-center text-xs text-muted-foreground"
                          >
                            지움
                          </button>
                        </div>
                      </TableCell>
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
      ))}

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