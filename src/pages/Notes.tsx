import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BookOpen, CheckCircle, XCircle, Eye, EyeOff, ArrowLeft, Edit2, Save, X, Settings, Brain, Target, TrendingUp, Calendar, Camera, ChevronDown, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, useParams } from "react-router-dom";
import { FlashCard } from "@/components/study/FlashCard";
import { Quiz } from "@/components/study/Quiz";
import { SubjectiveQuiz } from "@/components/study/SubjectiveQuiz";
import { StudyModeSelector } from "@/components/study/StudyModeSelector";
import { ProgressTracker } from "@/components/study/ProgressTracker";
import { ReviewScheduler } from "@/components/study/ReviewScheduler";
import OCRCamera from "@/components/OCRCamera";
import { useGPTChat } from "@/hooks/useGPTChat";


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

export default function Notes() {
  const { subject, book, chapter } = useParams<{ subject: string; book: string; chapter: string }>();
  const { toast } = useToast();
  
  const [notes, setNotes] = useState<WrongNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNote, setNewNote] = useState<NewNote>({
    question: "",
    sourceText: "",
    explanation: ""
  });
  const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean }>({});
  const [editingFields, setEditingFields] = useState<{ [key: string]: { field: string; value: string } }>({});
  const [studyMode, setStudyMode] = useState<'list' | 'flashcard' | 'quiz' | 'subjective'>('list');
  const [currentStudyNotes, setCurrentStudyNotes] = useState<any[]>([]);
  const [showOCR, setShowOCR] = useState(false);
  const [gptLoading, setGptLoading] = useState(false);

  const decodedSubject = decodeURIComponent(subject || '');
  const decodedBook = decodeURIComponent(book || '');
  const decodedChapter = decodeURIComponent(chapter || '');

  const { messages, isLoading: chatLoading, sendMessage } = useGPTChat();

  useEffect(() => {
    loadNotes();
  }, [subject, book, chapter]);

  const loadNotes = async () => {
    try {
      const { data, error } = await (supabase as any)
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
    if (!newNote.question.trim() || !subject || !book || !chapter) {
      toast({
        title: "필수 입력",
        description: "문제를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('wrong_notes')
        .insert({
          question: newNote.question.trim(),
          source_text: newNote.sourceText.trim() || '',
          explanation: newNote.explanation.trim() || '',
          subject_name: decodedSubject,
          book_name: decodedBook,
          chapter_name: decodedChapter,
          is_resolved: false
        })
        .select()
        .single();

      if (error) throw error;

      // 복습 스케줄 생성
      const { error: scheduleError } = await (supabase as any)
        .from('review_schedule')
        .insert({
          wrong_note_id: data.id,
          next_review_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1일 후
          interval_days: 1,
          review_count: 0,
          is_completed: false
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
    setNewNote(prev => ({
      ...prev,
      question: prev.question + text
    }));
    setShowOCR(false);
  };

  const handleGPTGeneration = async () => {
    if (!newNote.question.trim()) {
      toast({
        title: "문제를 입력해주세요",
        description: "GPT 기능을 사용하려면 먼저 문제를 입력해야 합니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      setGptLoading(true);
      
      const { data, error } = await supabase.functions.invoke('chat-with-gpt', {
        body: {
          message: `다음 문제에 대해 다음과 같은 형식으로 답변해줘:

문제: ${newNote.question}

답변 형식:
1. **📋 관련 기준서/법령 원문**
[관련 기준서, 법령, 규정의 원문을 정확히 인용해줘]

2. **💡 해설 및 풀이**
[위 기준서/법령을 바탕으로 한 상세한 해설과 풀이과정]`,
          pdfContent: '',
          messages: []
        },
      });

      if (error) {
        console.error('GPT API 에러:', error);
        throw error;
      }

      if (data?.response) {
        const response = data.response;
        
        // 응답을 파싱해서 근거 원문과 해설을 분리
        const lines = response.split('\n');
        let sourceText = '';
        let explanation = '';
        let currentSection = '';
        
        for (const line of lines) {
          if (line.includes('📋') || line.includes('관련 기준서') || line.includes('법령 원문')) {
            currentSection = 'source';
            continue;
          } else if (line.includes('💡') || line.includes('해설') || line.includes('풀이')) {
            currentSection = 'explanation';
            continue;
          }
          
          if (currentSection === 'source' && line.trim()) {
            sourceText += line + '\n';
          } else if (currentSection === 'explanation' && line.trim()) {
            explanation += line + '\n';
          }
        }
        
        // 만약 분리가 안되면 전체를 해설에 넣기
        if (!sourceText.trim() && !explanation.trim()) {
          explanation = response;
        }
        
        setNewNote(prev => ({
          ...prev,
          sourceText: sourceText.trim() || prev.sourceText,
          explanation: explanation.trim() || prev.explanation
        }));
        
        toast({
          title: "GPT 생성 완료",
          description: "AI가 근거 원문과 해설을 생성했습니다.",
        });
      } else {
        throw new Error('응답을 받지 못했습니다.');
      }
    } catch (error) {
      console.error('GPT 생성 에러:', error);
      toast({
        title: "GPT 생성 실패",
        description: "AI 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setGptLoading(false);
    }
  };

  const toggleAnswerVisibility = (noteId: string) => {
    setShowAnswers(prev => ({
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
        explanation: null,
        subject_name: decodedSubject,
        book_name: decodedBook,
        chapter_name: decodedChapter,
        is_resolved: note.isResolved
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
            className="text-sm"
            rows={3}
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

      {/* 학습 모드 선택 */}
      <StudyModeSelector 
        noteCount={notes.length}
        onModeSelect={(mode) => {
          if (mode === 'flashcard') handleStudyModeChange('flashcard');
          else if (mode === 'multiple-choice') handleStudyModeChange('quiz');
          else if (mode === 'subjective') handleStudyModeChange('subjective');
        }}
      />
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOCR(true)}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    OCR
                  </Button>
                </div>
                <Textarea
                  id="question"
                  placeholder="문제를 입력하세요"
                  value={newNote.question}
                  onChange={(e) => setNewNote({...newNote, question: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="sourceText">근거 원문</Label>
                <Textarea
                  id="sourceText"
                  placeholder="관련 기준서/법령 원문을 입력하세요"
                  value={newNote.sourceText}
                  onChange={(e) => setNewNote({...newNote, sourceText: e.target.value})}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="explanation">해설</Label>
                <Textarea
                  id="explanation"
                  placeholder="해설을 입력하세요"
                  value={newNote.explanation}
                  onChange={(e) => setNewNote({...newNote, explanation: e.target.value})}
                  rows={4}
                />
              </div>

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
                  disabled={!newNote.question || !newNote.sourceText}
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
                              className="text-base"
                              rows={3}
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
                            <p 
                              className="text-base cursor-pointer p-2 rounded border hover:bg-muted/50"
                              onClick={() => startEdit(note.id, 'question', note.question)}
                            >
                              {note.question}
                            </p>
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
                          {renderAnswerField(note, 'sourceText', '근거 원문', 'bg-blue/10 border-blue/20', 'text-blue-600')}
                          {note.explanation && renderAnswerField(note, 'explanation', '해설', 'bg-green/10 border-green/20', 'text-green-600')}
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

      {/* 복습 스케줄러 */}
      <ReviewScheduler />
    </div>
  );
}