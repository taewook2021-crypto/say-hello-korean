import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BookOpen, CheckCircle, XCircle, Eye, EyeOff, ArrowLeft, Download, Printer, Edit2, Save, X, Settings, Brain, Target, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadPDF, printPDF } from "@/components/pdf-generator";
import { PdfTemplateSelector, PdfTemplate } from "@/components/PdfTemplateSelector";
import { useToast } from "@/hooks/use-toast";
import { Link, useParams } from "react-router-dom";
import { FlashCard } from "@/components/study/FlashCard";
import { Quiz } from "@/components/study/Quiz";
import { SubjectiveQuiz } from "@/components/study/SubjectiveQuiz";
import { StudyModeSelector } from "@/components/study/StudyModeSelector";
import { ProgressTracker } from "@/components/study/ProgressTracker";
import { ReviewScheduler } from "@/components/study/ReviewScheduler";
import { OCRUploader } from "@/components/OCRUploader";

interface WrongNote {
  id: string;
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  createdAt: Date;
  isResolved: boolean;
}

const Index = () => {
  const { subjectName, bookName, chapterName } = useParams<{
    subjectName: string;
    bookName: string;
    chapterName: string;
  }>();
  const [notes, setNotes] = useState<WrongNote[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean }>({});
  const [editingFields, setEditingFields] = useState<{ [key: string]: { field: string; value: string } | null }>({});
  const [loading, setLoading] = useState(true);
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [selectedStudyMode, setSelectedStudyMode] = useState<'flashcard' | 'multiple-choice' | 'subjective' | null>(null);
  const [pdfOptions, setPdfOptions] = useState({
    includeWrongAnswers: true,
    unresolvedOnly: false
  });
  const [showPdfTemplateSelector, setShowPdfTemplateSelector] = useState(false);
  const [selectedPdfTemplates, setSelectedPdfTemplates] = useState<{cover?: PdfTemplate, paper?: PdfTemplate}>({});
  const { toast } = useToast();
  
  const subject = decodeURIComponent(subjectName || '');
  const book = decodeURIComponent(bookName || '');
  const chapter = decodeURIComponent(chapterName || '');

  const [newNote, setNewNote] = useState({
    question: "",
    wrongAnswer: "",
    correctAnswer: ""
  });

  const [ocrTarget, setOcrTarget] = useState<"question" | "wrongAnswer" | "correctAnswer">("question");

  const handleOCRTextExtracted = (text: string) => {
    setNewNote(prev => {
      const next: any = { ...prev };
      const prevVal = next[ocrTarget] as string;
      next[ocrTarget] = prevVal ? `${prevVal}\n\n${text}` : text;
      return next;
    });
  };

  useEffect(() => {
    if (subject && book && chapter) {
      loadNotes();
    }
  }, [subject, book, chapter]);

  const loadNotes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('wrong_notes')
        .select('*')
        .eq('subject_name', subject)
        .eq('book_name', book)
        .eq('chapter_name', chapter)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setNotes(data.map((note: any) => ({
        id: note.id,
        question: note.question,
        wrongAnswer: note.wrong_answer || '',
        correctAnswer: note.correct_answer,
        createdAt: new Date(note.created_at),
        isResolved: note.is_resolved
      })));
    } catch (error) {
      console.error('Error loading notes:', error);
      toast({
        title: "오류",
        description: "오답노트를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.question || !newNote.correctAnswer || !subject || !book || !chapter) {
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('wrong_notes')
        .insert({
          question: newNote.question,
          wrong_answer: newNote.wrongAnswer,
          correct_answer: newNote.correctAnswer,
          subject_name: subject,
          book_name: book,
          chapter_name: chapter,
          is_resolved: false
        })
        .select()
        .single();

      if (error) throw error;

      // 에빙하우스 망각곡선에 따른 첫 번째 복습 스케줄 생성 (20분 후)
      const nextReviewDate = new Date();
      nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 20);

      const { error: scheduleError } = await supabase
        .from('review_schedule')
        .insert({
          wrong_note_id: data.id,
          review_count: 0,
          next_review_date: nextReviewDate.toISOString(),
          interval_days: 1,
          ease_factor: 2.5,
          is_completed: false,
          user_id: null // RLS가 있어서 자동으로 설정됨
        });

      if (scheduleError) {
        console.error('Error creating review schedule:', scheduleError);
        // 스케줄 생성 실패해도 오답노트는 저장되도록 함
      }

      const note: WrongNote = {
        id: data.id,
        question: data.question,
        wrongAnswer: data.wrong_answer || '',
        correctAnswer: data.correct_answer,
        createdAt: new Date(data.created_at),
        isResolved: data.is_resolved
      };

      setNotes([note, ...notes]);
      setNewNote({
        question: "",
        wrongAnswer: "",
        correctAnswer: ""
      });
      setShowAddForm(false);
      
      toast({
        title: "오답노트 추가됨",
        description: "내일부터 복습 알림이 시작됩니다. 🗓️",
      });
      
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "오류",
        description: "오답노트 저장에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const toggleResolved = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    try {
      const { error } = await (supabase as any)
        .from('wrong_notes')
        .update({ is_resolved: !note.isResolved })
        .eq('id', id);

      if (error) throw error;

      setNotes(notes.map(note => 
        note.id === id ? { ...note, isResolved: !note.isResolved } : note
      ));
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "오류",
        description: "상태 변경에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const startEdit = (noteId: string, field: string, currentValue: string) => {
    setEditingFields({
      ...editingFields,
      [noteId]: { field, value: currentValue }
    });
  };

  const cancelEdit = (noteId: string) => {
    setEditingFields({
      ...editingFields,
      [noteId]: null
    });
  };

  const saveEdit = async (noteId: string) => {
    const editData = editingFields[noteId];
    if (!editData) return;

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (editData.field === 'question') {
        updateData.question = editData.value;
      } else if (editData.field === 'wrongAnswer') {
        updateData.wrong_answer = editData.value;
      } else if (editData.field === 'correctAnswer') {
        updateData.correct_answer = editData.value;
      }

      const { error } = await (supabase as any)
        .from('wrong_notes')
        .update(updateData)
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.map(note => 
        note.id === noteId 
          ? {
              ...note,
              [editData.field]: editData.value
            }
          : note
      ));

      setEditingFields({
        ...editingFields,
        [noteId]: null
      });

      toast({
        title: "성공",
        description: "오답노트가 수정되었습니다.",
      });
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "오류",
        description: "오답노트 수정에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const updateEditValue = (noteId: string, value: string) => {
    const editData = editingFields[noteId];
    if (!editData) return;

    setEditingFields({
      ...editingFields,
      [noteId]: { ...editData, value }
    });
  };

  const toggleShowAnswer = (id: string) => {
    setShowAnswers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleTemplateSelect = (coverTemplate: PdfTemplate, paperTemplate: PdfTemplate) => {
    setSelectedPdfTemplates({ cover: coverTemplate, paper: paperTemplate });
  };

  const handleDownloadPDF = async (options = pdfOptions) => {
    // 항상 템플릿 선택기를 먼저 보여줌
    setShowPdfTemplateSelector(true);
  };

  const proceedWithDownload = async (options = pdfOptions) => {
    const filteredNotes = options.unresolvedOnly 
      ? notes.filter(note => !note.isResolved)
      : notes;

    if (filteredNotes.length === 0) {
      toast({
        title: "알림",
        description: options.unresolvedOnly 
          ? "미해결 오답노트가 없습니다."
          : "내보낼 오답노트가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    if (!subject || !book || !chapter) {
      toast({
        title: "오류",
        description: "과목, 교재, 단원 정보가 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    const extendedOptions = {
      ...options,
      paperTemplate: selectedPdfTemplates.paper?.id || 'lined-paper'
    };

    const success = await downloadPDF(filteredNotes, subject, book, chapter, extendedOptions);
    if (success) {
      toast({
        title: "성공",
        description: "PDF 파일이 다운로드되었습니다.",
      });
    } else {
      toast({
        title: "오류",
        description: "PDF 생성에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handlePrintPDF = async (options = pdfOptions) => {
    const filteredNotes = options.unresolvedOnly 
      ? notes.filter(note => !note.isResolved)
      : notes;

    if (filteredNotes.length === 0) {
      toast({
        title: "알림",
        description: options.unresolvedOnly 
          ? "미해결 오답노트가 없습니다."
          : "인쇄할 오답노트가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    if (!subject || !book || !chapter) {
      toast({
        title: "오류",
        description: "과목, 교재, 단원 정보가 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    const success = await printPDF(filteredNotes, subject, book, chapter, {
      ...options,
      paperTemplate: selectedPdfTemplates.paper?.id || 'lined-paper'
    });
    if (!success) {
      toast({
        title: "오류",
        description: "PDF 인쇄에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const renderEditableField = (note: WrongNote, field: keyof WrongNote, label: string, isTextarea = false, showEditButton = true) => {
    const noteId = note.id;
    const editData = editingFields[noteId];
    const isEditing = editData?.field === field;
    const value = note[field] as string;

    if (isEditing) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{label}</h4>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => saveEdit(noteId)}
                className="h-8 w-8 p-0"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => cancelEdit(noteId)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {isTextarea ? (
            <Textarea
              value={editData.value}
              onChange={(e) => updateEditValue(noteId, e.target.value)}
              className="min-h-[100px]"
              autoFocus
            />
          ) : (
            <Input
              value={editData.value}
              onChange={(e) => updateEditValue(noteId, e.target.value)}
              autoFocus
            />
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">{label}</h4>
          {showEditButton && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => startEdit(noteId, field, value)}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className={`bg-muted p-4 rounded-lg border ${showEditButton ? 'cursor-pointer' : ''}`} onClick={showEditButton ? () => startEdit(noteId, field, value) : undefined}>
          <p className="text-base leading-relaxed">{value || "클릭하여 입력"}</p>
        </div>
      </div>
    );
  };

  const renderAnswerField = (note: WrongNote, field: keyof WrongNote, label: string, bgColor: string, textColor: string, showEditButton = true) => {
    const noteId = note.id;
    const editData = editingFields[noteId];
    const isEditing = editData?.field === field;
    const value = note[field] as string;

    if (isEditing) {
      return (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-medium ${textColor} flex items-center gap-1`}>
              {field === 'wrongAnswer' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              {label}
            </h4>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => saveEdit(noteId)}
                className="h-6 w-6 p-0"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => cancelEdit(noteId)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Input
            value={editData.value}
            onChange={(e) => updateEditValue(noteId, e.target.value)}
            autoFocus
          />
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className={`font-medium ${textColor} flex items-center gap-1`}>
            {field === 'wrongAnswer' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            {label}
          </h4>
          {showEditButton && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => startEdit(noteId, field, value)}
              className="h-6 w-6 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div 
          className={`text-sm ${bgColor} p-3 rounded-lg border ${showEditButton ? 'cursor-pointer' : ''} ${field === 'correctAnswer' ? 'font-medium' : ''}`}
          onClick={showEditButton ? () => startEdit(noteId, field, value) : undefined}
        >
          {value || "클릭하여 입력"}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                뒤로가기
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">오답노트</h1>
              </div>
              {subject && book && chapter && (
                <p className="text-sm text-muted-foreground mt-1">
                  {subject} {' > '} {book} {' > '} {chapter}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowStudyModal(true)}
              disabled={notes.length === 0}
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              복습하기
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={notes.length === 0}
                >
                  <Settings className="h-4 w-4" />
                  PDF 옵션
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>PDF 생성 옵션</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeWrongAnswers"
                      checked={pdfOptions.includeWrongAnswers}
                      onCheckedChange={(checked) => 
                        setPdfOptions(prev => ({ 
                          ...prev, 
                          includeWrongAnswers: checked as boolean 
                        }))
                      }
                    />
                    <Label htmlFor="includeWrongAnswers">내가 작성한 답 포함</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="unresolvedOnly"
                      checked={pdfOptions.unresolvedOnly}
                      onCheckedChange={(checked) => 
                        setPdfOptions(prev => ({ 
                          ...prev, 
                          unresolvedOnly: checked as boolean 
                        }))
                      }
                    />
                    <Label htmlFor="unresolvedOnly">미해결 문제만 인쇄</Label>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    onClick={() => handleDownloadPDF(pdfOptions)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    PDF 다운로드
                  </Button>
                  <Button 
                    onClick={() => handlePrintPDF(pdfOptions)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    인쇄하기
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2"
              disabled={!subject || !book || !chapter}
            >
              <Plus className="h-4 w-4" />
              문제 추가
            </Button>
          </div>
        </div>

        {/* Add New Note Form */}
        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>새로운 오답 추가</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* OCR 업로더 */}
              <div className="border-b pb-4 space-y-3">
                <div className="flex items-center gap-4">
                  <Label className="text-sm">OCR 대상:</Label>
                  {(["question","wrongAnswer","correctAnswer"] as const).map(k => (
                    <label key={k} className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name="ocrTarget"
                        checked={ocrTarget === k}
                        onChange={() => setOcrTarget(k)}
                      />
                      {k === "question" ? "문제" : k === "wrongAnswer" ? "내 답" : "정답"}
                    </label>
                  ))}
                </div>
                <OCRUploader onTextExtracted={handleOCRTextExtracted} />
              </div>

              <div>
                <Label htmlFor="question">문제</Label>
                <Textarea
                  id="question"
                  placeholder="틀린 문제를 적어주세요"
                  value={newNote.question}
                  onChange={(e) => setNewNote({...newNote, question: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="wrongAnswer">내가 적은 답</Label>
                <Input
                  id="wrongAnswer"
                  placeholder="틀린 답안"
                  value={newNote.wrongAnswer}
                  onChange={(e) => setNewNote({...newNote, wrongAnswer: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="correctAnswer">정답</Label>
                <Input
                  id="correctAnswer"
                  placeholder="올바른 답안"
                  value={newNote.correctAnswer}
                  onChange={(e) => setNewNote({...newNote, correctAnswer: e.target.value})}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddNote}>저장</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes List */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-1/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : notes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {subject && book && chapter ? "아직 오답노트가 없습니다" : "단원을 선택해주세요"}
                </h3>
                <p className="text-muted-foreground">
                  {subject && book && chapter ? "첫 번째 문제를 추가해보세요!" : "과목 → 교재 → 단원을 선택한 후 오답노트를 작성할 수 있습니다."}
                </p>
              </CardContent>
            </Card>
          ) : (
            notes.map((note) => (
              <Card key={note.id} className={note.isResolved ? "border-primary/50 bg-primary/5" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {note.createdAt.toLocaleDateString('ko-KR')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleResolved(note.id)}
                      className="flex items-center gap-1"
                    >
                       {note.isResolved ? (
                         <>
                           <CheckCircle className="h-4 w-4 text-primary" />
                           해결완료
                         </>
                       ) : (
                         <>
                           <XCircle className="h-4 w-4 text-destructive" />
                           미해결
                         </>
                       )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderEditableField(note, 'question', '문제', true, showAnswers[note.id])}

                  <div className="flex justify-center">
                    <Button
                      onClick={() => toggleShowAnswer(note.id)}
                      variant={showAnswers[note.id] ? "secondary" : "default"}
                      className="flex items-center gap-2"
                    >
                      {showAnswers[note.id] ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          답안 숨기기
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          답안 보기
                        </>
                      )}
                    </Button>
                  </div>

                  {showAnswers[note.id] && (
                    <div className="space-y-4 border-t pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {(note.wrongAnswer || editingFields[note.id]?.field === 'wrongAnswer') && (
                           renderAnswerField(note, 'wrongAnswer', '내가 적은 답', 'bg-destructive/10 border-destructive/20', 'text-destructive')
                         )}
                         
                         {renderAnswerField(note, 'correctAnswer', '정답', 'bg-primary/10 border-primary/20', 'text-primary')}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* 복습 모달 */}
        <Dialog open={showStudyModal} onOpenChange={(open) => {
          setShowStudyModal(open);
          if (!open) setSelectedStudyMode(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                {selectedStudyMode ? '복습하기' : '복습 모드 선택'}
                <Badge variant="outline">{notes.length}개 문제</Badge>
              </DialogTitle>
            </DialogHeader>
            
            <div className="mt-6">
              {!selectedStudyMode ? (
                <StudyModeSelector 
                  noteCount={notes.length}
                  onModeSelect={(mode) => setSelectedStudyMode(mode)}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedStudyMode(null)}
                    >
                      ← 모드 선택으로 돌아가기
                    </Button>
                  </div>

                  {selectedStudyMode === 'flashcard' && (() => {
                    const mappedNotes = notes.map(n => ({
                      id: n.id,
                      question: n.question,
                      wrong_answer: n.wrongAnswer,
                      correct_answer: n.correctAnswer,
                      explanation: null,
                      subject_name: subject || '',
                      book_name: book || '',
                      chapter_name: chapter || '',
                      is_resolved: n.isResolved
                    }));
                    
                    console.log('Total notes for FlashCard:', mappedNotes.length);
                    console.log('Notes data:', mappedNotes);
                    
                    if (mappedNotes.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">복습할 문제가 없습니다.</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            먼저 오답노트를 추가해주세요.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <FlashCard 
                        notes={mappedNotes} 
                        onComplete={() => {
                          setShowStudyModal(false);
                          setSelectedStudyMode(null);
                          loadNotes();
                          toast({
                            title: "복습 완료",
                            description: "플래시카드 학습이 완료되었습니다."
                          });
                        }} 
                      />
                    );
                  })()}

                  {selectedStudyMode === 'multiple-choice' && (
                    <Quiz 
                      notes={notes.map(n => ({
                        id: n.id,
                        question: n.question,
                        wrong_answer: n.wrongAnswer,
                        correct_answer: n.correctAnswer,
                        explanation: null,
                        subject_name: subject || '',
                        book_name: book || '',
                        chapter_name: chapter || '',
                        is_resolved: n.isResolved
                      }))} 
                      onComplete={() => {
                        setShowStudyModal(false);
                        setSelectedStudyMode(null);
                        loadNotes();
                        toast({
                          title: "퀴즈 완료",
                          description: "객관식 퀴즈가 완료되었습니다."
                        });
                      }} 
                    />
                  )}

                  {selectedStudyMode === 'subjective' && (
                    <SubjectiveQuiz 
                      notes={notes.map(n => ({
                        id: n.id,
                        question: n.question,
                        wrong_answer: n.wrongAnswer,
                        correct_answer: n.correctAnswer,
                        explanation: null,
                        subject_name: subject || '',
                        book_name: book || '',
                        chapter_name: chapter || '',
                        is_resolved: n.isResolved
                      }))} 
                      onComplete={() => {
                        setShowStudyModal(false);
                        setSelectedStudyMode(null);
                        loadNotes();
                        toast({
                          title: "퀴즈 완료",
                          description: "주관식 퀴즈가 완료되었습니다."
                        });
                      }} 
                    />
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* PDF 템플릿 선택기 모달 */}
        <Dialog open={showPdfTemplateSelector} onOpenChange={setShowPdfTemplateSelector}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>PDF 템플릿 선택</DialogTitle>
            </DialogHeader>
            <div className="mt-6">
              <PdfTemplateSelector
                onSelect={(coverTemplate, paperTemplate) => {
                  handleTemplateSelect(coverTemplate, paperTemplate);
                  setShowPdfTemplateSelector(false);
                  // 템플릿 선택 후 PDF 다운로드 실행 (새로 선택된 템플릿 사용)
                  setTimeout(() => {
                    const updatedOptions = {
                      ...pdfOptions,
                      paperTemplate: paperTemplate.id
                    };
                    proceedWithDownload(updatedOptions);
                  }, 100);
                }}
                selectedCover={selectedPdfTemplates.cover}
                selectedPaper={selectedPdfTemplates.paper}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;