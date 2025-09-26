import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { HtmlContent } from "@/components/ui/html-content";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BookOpen, CheckCircle, XCircle, Eye, EyeOff, ArrowLeft, Edit2, Save, X, Settings, Brain, Target, TrendingUp, Calendar, Camera, ChevronDown, Sparkles, Loader2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, useParams } from "react-router-dom";
import { FlashCard } from "@/components/study/FlashCard";
import { Quiz } from "@/components/study/Quiz";
import { SubjectiveQuiz } from "@/components/study/SubjectiveQuiz";
import { StudyModeSelector } from "@/components/study/StudyModeSelector";
import { ProgressTracker } from "@/components/study/ProgressTracker";
import { TemplateDocumentGenerator } from "@/components/study/TemplateDocumentGenerator";
import OCRCamera from "@/components/OCRCamera";


interface WrongNote {
  id: string;
  question: string;
  sourceText: string;
  explanation?: string;
  createdAt: Date;
  isResolved: boolean;
}

interface NewNote {
  question: string;
  sourceText: string;
  explanation: string;
}

function Notes() {
  const { subjectName, bookName, chapterName } = useParams<{ subjectName: string; bookName: string; chapterName: string }>();
  const { toast } = useToast();
  
  const [notes, setNotes] = useState<WrongNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNote, setNewNote] = useState<NewNote>({
    question: "",
    sourceText: "",
    explanation: ""
  });
  const [showMultipleChoice, setShowMultipleChoice] = useState(false);
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState([
    { text: '', is_correct: true },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false }
  ]);
  const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean }>({});
  const [showMultipleChoices, setShowMultipleChoices] = useState<{ [key: string]: boolean }>({});
  const [editingFields, setEditingFields] = useState<{ [key: string]: { field: string; value: string } }>({});
  const [studyMode, setStudyMode] = useState<'list' | 'flashcard' | 'quiz' | 'subjective'>('list');
  const [currentStudyNotes, setCurrentStudyNotes] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [showOCR, setShowOCR] = useState(false);
  
  const [gptLoading, setGptLoading] = useState(false);

  const decodedSubject = decodeURIComponent(subjectName || '');
  const decodedBook = decodeURIComponent(bookName || '');
  const decodedChapter = decodeURIComponent(chapterName || '');


  useEffect(() => {
    loadNotes();
    loadCurrentRound();
  }, [subjectName, bookName, chapterName]);

  const loadCurrentRound = async () => {
    try {
      const { data, error } = await supabase
        .from('study_progress')
        .select('round_number')
        .eq('subject_name', decodedSubject)
        .eq('book_name', decodedBook)
        .eq('chapter_name', decodedChapter)
        .eq('is_completed', false)
        .order('round_number', { ascending: true })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setCurrentRound(data[0].round_number);
      }
    } catch (error) {
      console.error('Error loading current round:', error);
    }
  };

  const loadNotes = async () => {
    try {
      // Get current user for RLS
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('User not authenticated');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('wrong_notes')
        .select('*')
        .eq('subject_name', decodedSubject)
        .eq('book_name', decodedBook)
        .eq('chapter_name', decodedChapter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setNotes(data.map((note: any) => ({
        id: note.id,
        question: note.question,
        sourceText: note.source_text || '',
        explanation: note.explanation || '',
        createdAt: new Date(note.created_at),
        isResolved: note.is_resolved,
        multiple_choice_options: note.multiple_choice_options || null
      } as any)));
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
    if (!newNote.question.trim()) {
      toast({
        title: "필수 입력",
        description: "문제를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Validate multiple choice options if enabled
    if (showMultipleChoice) {
      const correctAnswers = multipleChoiceOptions.filter(opt => opt.is_correct);
      const filledOptions = multipleChoiceOptions.filter(opt => opt.text.trim());
      
      if (correctAnswers.length !== 1) {
        toast({
          title: "선택지 오류",
          description: "정답을 정확히 1개 선택해주세요.",
          variant: "destructive",
        });
        return;
      }
      
      if (filledOptions.length < 4) {
        toast({
          title: "선택지 오류",
          description: "모든 선택지를 입력해주세요.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!decodedSubject || !decodedBook || !decodedChapter) {
      toast({
        title: "경로 오류",
        description: "과목, 책, 챕터 정보가 올바르지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "인증 필요",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        });
        return;
      }

      const insertData: any = {
        question: newNote.question.trim(),
        source_text: newNote.sourceText.trim() || '',
        explanation: newNote.explanation.trim() || '',
        subject_name: decodedSubject,
        book_name: decodedBook,
        chapter_name: decodedChapter,
        is_resolved: false,
        user_id: user.id
      };

      // Add multiple choice options if provided
      if (showMultipleChoice) {
        insertData.multiple_choice_options = multipleChoiceOptions;
      }

      const { data, error } = await supabase
        .from('wrong_notes')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // 복습 스케줄 생성
      const { error: scheduleError } = await supabase
        .from('review_schedule')
        .insert({
          wrong_note_id: data.id,
          next_review_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1일 후
          interval_days: 1,
          review_count: 0,
          is_completed: false,
          user_id: user.id
        });

      if (scheduleError) {
        console.error('Error creating review schedule:', scheduleError);
        // 스케줄 생성 실패해도 오답노트는 저장되도록 함
      }

      const note: WrongNote = {
        id: data.id,
        question: data.question,
        sourceText: data.source_text || '',
        createdAt: new Date(data.created_at),
        isResolved: data.is_resolved
      };

      setNotes([note, ...notes]);
      setNewNote({
        question: "",
        sourceText: "",
        explanation: ""
      });
      setShowMultipleChoice(false);
      setMultipleChoiceOptions([
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ]);
      setShowAddForm(false);

      toast({
        title: "오답노트 추가 완료",
        description: "새로운 오답노트가 추가되었습니다.",
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "오류",
        description: "오답노트 추가에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('wrong_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.filter(note => note.id !== noteId));
      
      toast({
        title: "오답노트 삭제 완료",
        description: "오답노트가 삭제되었습니다.",
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "오류",
        description: "오답노트 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleResolveToggle = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    try {
      const { error } = await (supabase as any)
        .from('wrong_notes')
        .update({ is_resolved: !note.isResolved })
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.map(note => 
        note.id === noteId 
          ? { ...note, isResolved: !note.isResolved }
          : note
      ));

      toast({
        title: note.isResolved ? "해결됨 상태 해제" : "문제 해결 완료",
        description: note.isResolved ? "다시 복습 대상이 되었습니다." : "해결된 문제로 표시되었습니다.",
      });
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "오류",
        description: "상태 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleEditField = async (noteId: string, editData: { field: string; value: string }) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (editData.field === 'question') {
        updateData.question = editData.value;
      } else if (editData.field === 'sourceText') {
        updateData.source_text = editData.value;
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

      setEditingFields(prev => {
        const newState = { ...prev };
        delete newState[noteId];
        return newState;
      });

      toast({
        title: "수정 완료",
        description: "오답노트가 수정되었습니다.",
      });
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "오류",
        description: "수정에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const startEdit = (noteId: string, field: string, value: string) => {
    setEditingFields(prev => ({
      ...prev,
      [noteId]: { field, value }
    }));
  };

  const cancelEdit = (noteId: string) => {
    setEditingFields(prev => {
      const newState = { ...prev };
      delete newState[noteId];
      return newState;
    });
  };

  const saveEdit = (noteId: string) => {
    const editData = editingFields[noteId];
    if (editData) {
      handleEditField(noteId, editData);
    }
  };

  const updateEditValue = (noteId: string, value: string) => {
    setEditingFields(prev => ({
      ...prev,
      [noteId]: { ...prev[noteId], value }
    }));
  };

  const handleOCRResult = (text: string) => {
    setNewNote(prev => {
      // If prev.question is HTML, convert it to text, append new text, then convert back
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = prev.question;
      const existingText = tempDiv.textContent || tempDiv.innerText || '';
      return {
        ...prev,
        question: existingText + text
      };
    });
    setShowOCR(false);
  };

  const copyTablesFromQuestionToExplanation = () => {
    // 문제 텍스트에서 표만 추출
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newNote.question;
    const tables = tempDiv.querySelectorAll('table');
    
    if (tables.length === 0) {
      toast({
        title: "복사할 표가 없습니다",
        description: "문제란에 표가 없습니다.",
        variant: "destructive",
      });
      return;
    }
    
    // 표들을 HTML 문자열로 변환
    let tablesHtml = '';
    tables.forEach(table => {
      tablesHtml += table.outerHTML + '\n\n';
    });
    
    // 해설란에 표 추가
    setNewNote(prev => ({
      ...prev,
      explanation: prev.explanation + '\n\n' + tablesHtml
    }));
    
    toast({
      title: "표 복사 완료",
      description: `${tables.length}개의 표를 해설란에 복사했습니다.`,
    });
  };


  const handleGPTGeneration = async () => {
    toast({
      title: "준비 중",
      description: "GPT 기능은 현재 준비 중입니다.",
      variant: "destructive",
    });
    return;
  };

  const toggleAnswerVisibility = (noteId: string) => {
    setShowAnswers(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const toggleMultipleChoiceVisibility = (noteId: string) => {
    setShowMultipleChoices(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const getResolvedCount = () => {
    return notes.filter(note => note.isResolved).length;
  };

  const getTotalCount = () => {
    return notes.length;
  };

  const getProgressPercentage = () => {
    if (getTotalCount() === 0) return 0;
    return Math.round((getResolvedCount() / getTotalCount()) * 100);
  };

  const handleStudyModeChange = (mode: 'list' | 'flashcard' | 'quiz' | 'subjective') => {
    setStudyMode(mode);
    
    if (mode !== 'list') {
      // Convert WrongNote to study format
      const studyNotes = notes.map(note => ({
        id: note.id,
        question: note.question,
        source_text: note.sourceText,
        explanation: note.explanation || note.sourceText, // explanation이 없으면 sourceText 사용
        subject_name: decodedSubject,
        book_name: decodedBook,
        chapter_name: decodedChapter,
        is_resolved: note.isResolved,
        multiple_choice_options: (note as any).multiple_choice_options || null
      }));
      setCurrentStudyNotes(studyNotes);
    }
  };

  const handleStudyComplete = () => {
    setStudyMode('list');
    loadNotes(); // 학습 완료 후 데이터 새로고침
  };

  const renderAnswerField = (note: WrongNote, field: keyof WrongNote, label: string, bgColor: string, textColor: string, showEditButton: boolean = true) => {
    const value = note[field] as string;
    const isEditing = editingFields[note.id]?.field === field;
    
    if (isEditing) {
      return (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-medium ${textColor} flex items-center gap-1`}>
              {field === 'sourceText' ? <BookOpen className="h-4 w-4" /> : 
               field === 'explanation' ? <Brain className="h-4 w-4" /> : 
               <CheckCircle className="h-4 w-4" />}
              {label}
            </h4>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveEdit(note.id)}
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => cancelEdit(note.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Textarea
            value={editingFields[note.id]?.value || ''}
            onChange={(e) => updateEditValue(note.id, e.target.value)}
            className="text-sm min-h-[100px] resize-y"
          />
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className={`font-medium ${textColor} flex items-center gap-1`}>
            {field === 'sourceText' ? <BookOpen className="h-4 w-4" /> : 
             field === 'explanation' ? <Brain className="h-4 w-4" /> : 
             <CheckCircle className="h-4 w-4" />}
            {label}
          </h4>
          {showEditButton && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => startEdit(note.id, field, value)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div 
          className={`text-sm ${bgColor} p-3 rounded-lg border ${showEditButton ? 'cursor-pointer' : ''} ${field === 'sourceText' ? 'font-medium' : ''}`}
          onClick={showEditButton ? () => startEdit(note.id, field, value) : undefined}
        >
          {value || "클릭하여 입력"}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (studyMode === 'flashcard') {
    return (
      <div className="container mx-auto p-6">
        <FlashCard 
          notes={currentStudyNotes}
          onComplete={handleStudyComplete}
        />
      </div>
    );
  }

  if (studyMode === 'quiz') {
    return (
      <div className="container mx-auto p-6">
        <Quiz 
          notes={currentStudyNotes}
          onComplete={handleStudyComplete}
        />
      </div>
    );
  }

  if (studyMode === 'subjective') {
    return (
      <div className="container mx-auto p-6">
        <SubjectiveQuiz 
          notes={currentStudyNotes}
          onComplete={handleStudyComplete}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/subject/${encodeURIComponent(decodedSubject)}/book/${encodeURIComponent(decodedBook)}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              돌아가기
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{decodedChapter} 오답노트</h1>
            <p className="text-muted-foreground">{decodedSubject} &gt; {decodedBook}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            총 {getTotalCount()}개
          </Badge>
          <Badge variant="outline">
            해결됨 {getResolvedCount()}개 ({getProgressPercentage()}%)
          </Badge>
        </div>
      </div>

      {/* 학습 모드 선택 및 문서 생성 */}
      <div className="flex gap-2 flex-wrap">
        <StudyModeSelector 
          noteCount={notes.length}
          onModeSelect={(mode) => {
            if (mode === 'flashcard') handleStudyModeChange('flashcard');
            else if (mode === 'multiple-choice') handleStudyModeChange('quiz');
            else if (mode === 'subjective') handleStudyModeChange('subjective');
          }}
        />
        <TemplateDocumentGenerator 
          notes={notes}
          subject={decodedSubject}
          book={decodedBook}
          chapter={decodedChapter}
        />
      </div>
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              새 오답노트 추가
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="question">문제</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOCR(true)}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      OCR
                    </Button>
                  </div>
                </div>
                <RichTextEditor
                  content={newNote.question}
                  onChange={(content) => setNewNote(prev => ({ ...prev, question: content }))}
                  placeholder="문제를 입력하거나 설명을 작성해주세요. 표가 필요한 경우 툴바의 표 버튼을 사용하세요..."
                />
              </div>


              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="explanation">해설</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyTablesFromQuestionToExplanation}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    문제 표 복사
                  </Button>
                </div>
                <RichTextEditor
                  content={newNote.explanation}
                  onChange={(content) => setNewNote(prev => ({ ...prev, explanation: content }))}
                  placeholder="정답과 풀이 과정을 작성해주세요. 표 형태의 답안이 필요한 경우 툴바의 표 버튼을 사용하세요..."
                />
              </div>

              {/* Multiple Choice Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="multiple-choice-toggle"
                  checked={showMultipleChoice}
                  onChange={(e) => setShowMultipleChoice(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="multiple-choice-toggle">객관식 선지 추가</Label>
              </div>

              {/* Multiple Choice Options */}
              {showMultipleChoice && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                  <Label className="text-sm font-medium">객관식 선택지 (정답 1개, 오답 3개)</Label>
                  {multipleChoiceOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correct-answer"
                        checked={option.is_correct}
                        onChange={() => {
                          const newOptions = [...multipleChoiceOptions];
                          newOptions.forEach(opt => opt.is_correct = false);
                          newOptions[index].is_correct = true;
                          setMultipleChoiceOptions(newOptions);
                        }}
                        className="h-4 w-4"
                      />
                      <Input
                        placeholder={`선택지 ${index + 1}`}
                        value={option.text}
                        onChange={(e) => {
                          const newOptions = [...multipleChoiceOptions];
                          newOptions[index].text = e.target.value;
                          setMultipleChoiceOptions(newOptions);
                        }}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground">
                        {option.is_correct ? '정답' : '오답'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleGPTGeneration}
                  disabled={gptLoading || !newNote.question.trim()}
                  className="flex-shrink-0"
                >
                  {gptLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  GPT 이용하기
                </Button>
                <Button 
                  onClick={handleAddNote}
                  disabled={!newNote.question}
                >
                  추가하기
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddForm(false);
                    setNewNote({ question: "", sourceText: "", explanation: "" });
                  }}
                >
                  취소
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OCR 모달 */}
      {showOCR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">텍스트 인식</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowOCR(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <p>OCR 기능을 사용하여 텍스트를 인식하세요.</p>
              <Button onClick={() => setShowOCR(false)} className="mt-4">닫기</Button>
            </div>
          </div>
        </div>
      )}


      {/* 오답노트 목록 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">오답노트 목록</h2>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            새 오답노트 추가
          </Button>
        </div>

        {notes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">아직 오답노트가 없습니다</h3>
              <p className="text-muted-foreground text-center mb-4">
                첫 번째 오답노트를 추가해보세요.
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                오답노트 추가하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <Card key={note.id} className={note.isResolved ? "opacity-60" : ""}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={note.isResolved ? "secondary" : "default"}>
                            {note.isResolved ? "해결됨" : "미해결"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {note.createdAt.toLocaleDateString()}
                          </span>
                        </div>
                        
                        {editingFields[note.id]?.field === 'question' ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium">문제</h3>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => saveEdit(note.id)}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => cancelEdit(note.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <Textarea
                              value={editingFields[note.id]?.value || ''}
                              onChange={(e) => updateEditValue(note.id, e.target.value)}
                              className="text-base min-h-[100px] resize-y"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium">문제</h3>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEdit(note.id, 'question', note.question)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div 
                              className="cursor-pointer p-2 rounded border hover:bg-muted/50"
                              onClick={() => startEdit(note.id, 'question', note.question)}
                            >
                              <HtmlContent content={note.question} />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAnswerVisibility(note.id)}
                        >
                          {showAnswers[note.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleResolveToggle(note.id)}>
                              {note.isResolved ? <XCircle className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                              {note.isResolved ? "미해결로 표시" : "해결됨으로 표시"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-destructive"
                            >
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {showAnswers[note.id] && (
                      <div className="space-y-4 border-t pt-4">
                        <div className="grid grid-cols-1 gap-4">                         
                          {note.explanation && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-green-600">해설</span>
                                {(note as any).multiple_choice_options && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleMultipleChoiceVisibility(note.id)}
                                    className="h-6 px-2"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    <span className="text-xs">
                                      {showMultipleChoices[note.id] ? '선지 숨기기' : '선지 보기'}
                                    </span>
                                  </Button>
                                )}
                              </div>
                              <div className="text-sm bg-green/10 border-green/20 p-3 rounded-lg border">
                                <HtmlContent content={note.explanation} />
                              </div>
                              
                              {/* Multiple Choice Options */}
                              {showMultipleChoices[note.id] && (note as any).multiple_choice_options && (
                                <div className="bg-blue/10 border-blue/20 p-3 rounded-lg border">
                                  <h5 className="text-sm font-medium text-blue-600 mb-3">객관식 선택지</h5>
                                  <div className="space-y-2">
                                    {(note as any).multiple_choice_options.map((option: any, index: number) => (
                                      <div key={index} className={`flex items-center gap-2 p-2 rounded ${
                                        option.is_correct 
                                          ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800' 
                                          : 'bg-muted/50'
                                      }`}>
                                        <span className="text-sm font-mono w-6 h-6 rounded-full bg-background border flex items-center justify-center">
                                          {index + 1}
                                        </span>
                                        <span className="text-sm flex-1">{option.text}</span>
                                        {option.is_correct && (
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* OCR Camera */}
        <OCRCamera
          isOpen={showOCR}
          onClose={() => setShowOCR(false)}
          onTextExtracted={handleOCRResult}
        />

    </div>
  );
}

export default Notes;