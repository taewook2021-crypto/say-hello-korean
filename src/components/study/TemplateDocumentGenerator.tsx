import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2, FileImage } from "lucide-react";
import { toast } from "sonner";
import { generateWordFromTemplate, generatePdfFromTemplate } from "@/utils/templateGenerator";

interface WrongNote {
  id: string;
  question: string;
  sourceText: string;
  explanation?: string;
  createdAt: Date;
  isResolved: boolean;
}

interface TemplateDocumentGeneratorProps {
  notes: WrongNote[];
  subject?: string;
  book?: string;
  chapter?: string;
}

export const TemplateDocumentGenerator: React.FC<TemplateDocumentGeneratorProps> = ({
  notes,
  subject,
  book,
  chapter
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const selectAllNotes = () => {
    setSelectedNotes(notes.map(note => note.id));
  };

  const clearSelection = () => {
    setSelectedNotes([]);
  };

  const generateWordDocument = async () => {
    if (selectedNotes.length === 0) {
      toast.error("문서로 변환할 노트를 선택해주세요.");
      return;
    }

    setIsGenerating(true);
    
    try {
      // 선택된 노트들만 필터링
      const selectedWrongNotes = notes.filter(note => selectedNotes.includes(note.id));
      
      const fileName = await generateWordFromTemplate(selectedWrongNotes);
      toast.success(`Word 문서가 생성되었습니다: ${fileName}`);
      setIsDialogOpen(false);
      
    } catch (error) {
      console.error('문서 생성 중 오류:', error);
      toast.error("문서 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Word 문서 생성
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Word 문서 생성
          </DialogTitle>
          <DialogDescription>
            템플릿을 사용하여 선택한 오답노트들을 Word 문서로 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 선택 컨트롤 */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAllNotes}
              >
                전체 선택
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearSelection}
              >
                선택 해제
              </Button>
            </div>
            <Badge variant="secondary">
              {selectedNotes.length}/{notes.length} 선택
            </Badge>
          </div>

          {/* 노트 목록 */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {notes.map((note, index) => (
              <Card 
                key={note.id}
                className={`cursor-pointer transition-colors ${
                  selectedNotes.includes(note.id) 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleNoteSelection(note.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        {note.isResolved && (
                          <Badge variant="default" className="text-xs">
                            해결됨
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium text-sm line-clamp-2 mb-2">
                        {note.question}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        근거: {note.sourceText}
                      </p>
                      {note.explanation && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          해설: {note.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 생성 버튼 */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isGenerating}
            >
              취소
            </Button>
            <Button
              onClick={generateWordDocument}
              disabled={isGenerating || selectedNotes.length === 0}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Word 생성
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};