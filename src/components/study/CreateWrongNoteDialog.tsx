import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, Camera } from "lucide-react";
import OCRCamera from "@/components/OCRCamera";

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
  const [answer, setAnswer] = useState("");
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [showOCR, setShowOCR] = useState(false);

  const chapter = studyData.chapters.find(ch => ch.order === chapterOrder);
  const chapterName = chapter?.name || "";

  const handleOCRResult = (text: string) => {
    setProblemText(prev => prev + text);
    setShowOCR(false);
  };

  const generateAnswerWithGPT = async () => {
    if (!problemText.trim()) {
      toast.error("문제를 먼저 입력해주세요.");
      return;
    }

    setIsGeneratingAnswer(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-gpt', {
        body: {
          message: `다음 문제에 대한 해설을 작성해주세요:\n\n${problemText}`,
          messages: [], // 빈 배열로 초기화
          model: 'gpt-4o-mini',
          currentSubject: studyData.subject
        }
      });

      if (error) {
        console.error('GPT API 오류:', error);
        toast.error("해설 생성 중 오류가 발생했습니다.");
        return;
      }

      if (data?.response) {
        setAnswer(data.response);
        toast.success("GPT가 해설을 생성했습니다!");
      } else {
        toast.error("해설 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error('GPT 요청 오류:', error);
      toast.error("해설 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingAnswer(false);
    }
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
    onClose();
  };

  return (
    <>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="problemText">문제 *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOCR(true)}
                  className="flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  카메라로 입력
                </Button>
              </div>
              <Textarea
                id="problemText"
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                placeholder="문제를 입력하거나 설명을 작성해주세요..."
                className="min-h-24 mt-2"
              />
            </div>

            {/* 정답 */}
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="answer">정답 *</Label>
                {/* GPT 기능 일시 비활성화
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateAnswerWithGPT}
                  disabled={isGeneratingAnswer || !problemText.trim()}
                  className="flex items-center gap-2"
                >
                  {isGeneratingAnswer ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      GPT 해설 생성
                    </>
                  )}
                </Button>
                */}
              </div>
              <Textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="정답과 풀이 과정을 작성해주세요..."
                className="min-h-24 mt-2"
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

      {/* OCR Camera Modal */}
      <OCRCamera
        isOpen={showOCR}
        onClose={() => setShowOCR(false)}
        onTextExtracted={handleOCRResult}
      />
    </>
  );
}