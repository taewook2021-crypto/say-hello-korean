import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Table } from "lucide-react";
import OCRCamera from "@/components/OCRCamera";
import { TableCreator } from "@/components/ui/table-creator";

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
    answer: string;
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
  round: number; // 회독 번호 추가
  onNoteCreated: () => void;
}

export function CreateWrongNoteDialog({
  isOpen,
  onClose,
  studyData,
  chapterOrder,
  problemNumber,
  status,
  round, // 회독 번호 추가
  onNoteCreated
}: CreateWrongNoteDialogProps) {
  const [problemText, setProblemText] = useState("");
  const [answer, setAnswer] = useState("");
  const [showOCR, setShowOCR] = useState(false);
  const [showTableCreator, setShowTableCreator] = useState(false);
  const [isTableMode, setIsTableMode] = useState(false);
  const [problemTableHtml, setProblemTableHtml] = useState("");
  const [answerTableHtml, setAnswerTableHtml] = useState("");

  const chapter = studyData.chapters.find(ch => ch.order === chapterOrder);
  const chapterName = chapter?.name || "";

  const handleOCRResult = (text: string) => {
    setProblemText(prev => prev + text);
    setShowOCR(false);
  };

  const handleTableCreate = (tableHtml: string) => {
    setProblemText(prev => prev + '\n\n' + tableHtml + '\n\n');
    setShowTableCreator(false);
  };


  const generateAnswerWithGPT = async () => {
    toast.error("GPT 기능은 현재 준비 중입니다.");
    return;
  };

  const handleSave = async () => {
    if (!problemText.trim()) {
      toast.error("문제 내용을 입력해주세요.");
      return;
    }

    if (!answer.trim()) {
      toast.error("정답을 입력해주세요.");
      return;
    }

    try {
      // 현재 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      
      // 데이터베이스에 오답노트 저장
      const { error: dbError } = await supabase
        .from('wrong_notes')
        .insert({
          question: problemText.trim(),
          explanation: answer.trim(),
          subject_name: studyData.subject,
          book_name: studyData.textbook,
          chapter_name: chapterName,
          source_text: `${chapterName} ${problemNumber}번`,
          round_number: round, // 회독 번호 추가
          user_id: user?.id
        });

      if (dbError) {
        console.error('데이터베이스 저장 오류:', dbError);
        toast.error("오답노트 저장 중 오류가 발생했습니다.");
        return;
      }

      // 로컬 스토리지에도 저장 (기존 기능 유지)
      const wrongNote: WrongNote = {
        id: Date.now().toString(),
        subject: studyData.subject,
        textbook: studyData.textbook,
        chapter: chapterName,
        problemNumber,
        status,
        content: {
          problemText: problemText.trim(),
          answer: answer.trim()
        },
        createdAt: new Date()
      };

      const existingNotes = localStorage.getItem('aro-wrong-notes');
      const notes = existingNotes ? JSON.parse(existingNotes) : [];
      notes.push(wrongNote);
      localStorage.setItem('aro-wrong-notes', JSON.stringify(notes));

      toast.success("오답노트가 저장되었습니다!");
      
      // 폼 초기화
      setProblemText("");
      setAnswer("");
      
      onNoteCreated();
    } catch (error) {
      console.error('오답노트 저장 오류:', error);
      toast.error("오답노트 저장 중 오류가 발생했습니다.");
    }
  };

  const handleCancel = () => {
    // 폼 초기화
    setProblemText("");
    setAnswer("");
    setShowOCR(false);
    setShowTableCreator(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{status}</span>
              {round}회독 오답노트 작성
            </DialogTitle>
            <DialogDescription>
              {studyData.subject} &gt; {studyData.textbook} &gt; {chapterName} &gt; {problemNumber}번 문제 ({round}회독)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 문제 내용 */}
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="problemText">문제 *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOCR(true)}
                    className="flex items-center gap-2"
                    disabled={isTableMode}
                  >
                    <Camera className="w-4 h-4" />
                    카메라로 입력
                  </Button>
                  <Button
                    type="button"
                    variant={isTableMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsTableMode(!isTableMode)}
                    className="flex items-center gap-2"
                  >
                    <Table className="w-4 h-4" />
                    {isTableMode ? "텍스트 모드" : "표 생성 모드"}
                  </Button>
                </div>
              </div>
              {!isTableMode ? (
                <Textarea
                  id="problemText"
                  value={problemText}
                  onChange={(e) => setProblemText(e.target.value)}
                  placeholder="문제를 입력하거나 설명을 작성해주세요..."
                  className="mt-2 min-h-[120px] resize-y"
                />
              ) : (
                <div className="mt-2 border rounded-lg p-4 min-h-[120px]">
                  <TableCreator
                    isOpen={true}
                    onClose={() => {}}
                    onTableCreate={(tableHtml) => {
                      setProblemTableHtml(tableHtml);
                      setProblemText(tableHtml);
                    }}
                    inline={true}
                  />
                </div>
              )}
            </div>

            {/* 정답 */}
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="answer">정답 *</Label>
                <Button
                  type="button"
                  variant={isTableMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsTableMode(!isTableMode)}
                  className="flex items-center gap-2"
                >
                  <Table className="w-4 h-4" />
                  {isTableMode ? "텍스트 모드" : "표 생성 모드"}
                </Button>
              </div>
              {!isTableMode ? (
                <Textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="정답과 풀이 과정을 작성해주세요..."
                  className="mt-2 min-h-[120px] resize-y"
                />
              ) : (
                <div className="mt-2 border rounded-lg p-4 min-h-[120px]">
                  <TableCreator
                    isOpen={true}
                    onClose={() => {}}
                    onTableCreate={(tableHtml) => {
                      setAnswerTableHtml(tableHtml);
                      setAnswer(tableHtml);
                    }}
                    inline={true}
                  />
                </div>
              )}
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

      {/* OCR Camera Modal */}
      <OCRCamera
        isOpen={showOCR}
        onClose={() => setShowOCR(false)}
        onTextExtracted={handleOCRResult}
      />

      {/* Table Creator Modal */}
      <TableCreator
        isOpen={showTableCreator}
        onClose={() => setShowTableCreator(false)}
        onTableCreate={handleTableCreate}
      />
    </>
  );
}