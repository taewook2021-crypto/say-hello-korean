import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface WrongNote {
  id: string;
  subject: string;
  textbook: string;
  chapter: string;
  problemNumber: number;
  status: '🔺' | '❌';
  content: {
    problemText: string;
    wrongReason: string;
    keyConcept: string;
    reviewPoint: string;
  };
  createdAt: Date;
}

interface CreateWrongNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  studyData: StudyData;
  chapterOrder: number;
  problemNumber: number;
  status: '🔺' | '❌';
  onNoteCreated: () => void;
}

export function CreateWrongNoteDialog({
  isOpen,
  onClose,
  studyData,
  chapterOrder,
  problemNumber,
  status,
  onNoteCreated
}: CreateWrongNoteDialogProps) {
  const [problemText, setProblemText] = useState("");
  const [wrongReason, setWrongReason] = useState("");
  const [keyConcept, setKeyConcept] = useState("");
  const [reviewPoint, setReviewPoint] = useState("");

  const chapter = studyData.chapters.find(ch => ch.order === chapterOrder);
  const chapterName = chapter?.name || "";

  const handleSave = () => {
    if (!problemText.trim()) {
      toast.error("문제 내용을 입력해주세요.");
      return;
    }

    if (!wrongReason.trim()) {
      toast.error("틀린 이유를 입력해주세요.");
      return;
    }

    const wrongNote: WrongNote = {
      id: Date.now().toString(),
      subject: studyData.subject,
      textbook: studyData.textbook,
      chapter: chapterName,
      problemNumber,
      status,
      content: {
        problemText: problemText.trim(),
        wrongReason: wrongReason.trim(),
        keyConcept: keyConcept.trim(),
        reviewPoint: reviewPoint.trim()
      },
      createdAt: new Date()
    };

    // 로컬 스토리지에 오답노트 저장
    const existingNotes = localStorage.getItem('aro-wrong-notes');
    const notes = existingNotes ? JSON.parse(existingNotes) : [];
    notes.push(wrongNote);
    localStorage.setItem('aro-wrong-notes', JSON.stringify(notes));

    toast.success("오답노트가 저장되었습니다!");
    
    // 폼 초기화
    setProblemText("");
    setWrongReason("");
    setKeyConcept("");
    setReviewPoint("");
    
    onNoteCreated();
  };

  const handleCancel = () => {
    // 폼 초기화
    setProblemText("");
    setWrongReason("");
    setKeyConcept("");
    setReviewPoint("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">{status}</span>
            오답노트 작성
          </DialogTitle>
          <DialogDescription>
            {studyData.subject} &gt; {studyData.textbook} &gt; {chapterName} &gt; {problemNumber}번 문제
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 문제 내용 */}
          <div>
            <Label htmlFor="problemText">문제 내용 *</Label>
            <Textarea
              id="problemText"
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="문제를 입력하거나 설명을 작성해주세요..."
              className="min-h-24"
            />
          </div>

          {/* 틀린 이유 */}
          <div>
            <Label htmlFor="wrongReason">틀린 이유 *</Label>
            <Textarea
              id="wrongReason"
              value={wrongReason}
              onChange={(e) => setWrongReason(e.target.value)}
              placeholder="왜 틀렸는지 분석해보세요..."
              className="min-h-20"
            />
          </div>

          {/* 핵심 개념 */}
          <div>
            <Label htmlFor="keyConcept">핵심 개념</Label>
            <Textarea
              id="keyConcept"
              value={keyConcept}
              onChange={(e) => setKeyConcept(e.target.value)}
              placeholder="이 문제의 핵심 개념이나 공식을 정리해보세요..."
              className="min-h-20"
            />
          </div>

          {/* 다시 볼 포인트 */}
          <div>
            <Label htmlFor="reviewPoint">다시 볼 포인트</Label>
            <Textarea
              id="reviewPoint"
              value={reviewPoint}
              onChange={(e) => setReviewPoint(e.target.value)}
              placeholder="다음에 같은 실수를 하지 않기 위한 포인트를 적어보세요..."
              className="min-h-20"
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              취소
            </Button>
            <Button onClick={handleSave}>
              저장하기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}