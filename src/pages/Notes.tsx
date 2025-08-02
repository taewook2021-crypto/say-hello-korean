import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, CheckCircle, XCircle, Eye, EyeOff, ArrowLeft, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, useSearchParams } from "react-router-dom";

interface WrongNote {
  id: string;
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  explanation: string;
  createdAt: Date;
  isResolved: boolean;
}

const Index = () => {
  const [searchParams] = useSearchParams();
  const [notes, setNotes] = useState<WrongNote[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const subject = searchParams.get('subject');
  const book = searchParams.get('book');
  const chapter = searchParams.get('chapter');

  const [newNote, setNewNote] = useState({
    question: "",
    wrongAnswer: "",
    correctAnswer: "",
    explanation: ""
  });

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
          explanation: newNote.explanation,
          subject_name: subject,
          book_name: book,
          chapter_name: chapter,
          is_resolved: false
        })
        .select()
        .single();

      if (error) throw error;

      const note: WrongNote = {
        id: data.id,
        question: data.question,
        wrongAnswer: data.wrong_answer || '',
        correctAnswer: data.correct_answer,
        explanation: data.explanation || '',
        createdAt: new Date(data.created_at),
        isResolved: data.is_resolved
      };

      setNotes([note, ...notes]);
      setNewNote({
        question: "",
        wrongAnswer: "",
        correctAnswer: "",
        explanation: ""
      });
      setShowAddForm(false);
      toast({
        title: "성공",
        description: "오답노트가 저장되었습니다.",
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

  const toggleShowAnswer = (id: string) => {
    setShowAnswers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const exportToExcel = () => {
    if (notes.length === 0) {
      toast({
        title: "알림",
        description: "내보낼 오답노트가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const exportData = notes.map((note, index) => ({
      '번호': index + 1,
      '문제': note.question,
      '정답': note.correctAnswer,
      '해설': note.explanation || '',
      '해결상태': note.isResolved ? '해결완료' : '미해결',
      '작성일': note.createdAt.toLocaleDateString('ko-KR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    
    // 셀 너비 설정 - 문제와 해설을 매우 넓게
    worksheet['!cols'] = [
      { wch: 8 },   // 번호
      { wch: 100 }, // 문제 (매우 넓게)
      { wch: 30 },  // 정답
      { wch: 80 },  // 해설 (매우 넓게)
      { wch: 15 },  // 해결상태
      { wch: 15 }   // 작성일
    ];

    // 행 높이 설정 (헤더 제외한 모든 행을 높게)
    if (!worksheet['!rows']) worksheet['!rows'] = [];
    for (let i = 1; i <= exportData.length; i++) {
      if (!worksheet['!rows'][i]) worksheet['!rows'][i] = {};
      worksheet['!rows'][i].hpt = 60; // 행 높이를 60으로 설정
    }

    // 워크시트에 스타일 적용
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:F1');
    
    // 헤더 스타일링
    for (let col = range.s.c; col <= range.e.c; col++) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[headerCell]) worksheet[headerCell] = { v: "", t: "s" };
      worksheet[headerCell].s = {
        fill: { fgColor: { rgb: "ADD8E6" } }, // 연한 하늘색
        font: { bold: true, sz: 12, color: { rgb: "000000" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }

    // 데이터 셀 스타일링
    for (let row = 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) continue;
        
        worksheet[cellAddress].s = {
          alignment: { 
            wrapText: true, 
            vertical: "top",
            horizontal: col === 1 || col === 3 ? "left" : "center" // 문제와 해설은 왼쪽 정렬
          },
          border: {
            top: { style: "thin", color: { rgb: "CCCCCC" } },
            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
            left: { style: "thin", color: { rgb: "CCCCCC" } },
            right: { style: "thin", color: { rgb: "CCCCCC" } }
          }
        };
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, '오답노트');
    
    const fileName = `오답노트_${subject}_${book}_${chapter}_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "성공",
      description: "엑셀 파일이 다운로드되었습니다.",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {subject && book && (
              <Link to={`/subject/${encodeURIComponent(subject)}/book/${encodeURIComponent(book)}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  뒤로가기
                </Button>
              </Link>
            )}
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
              onClick={exportToExcel}
              variant="outline"
              className="flex items-center gap-2"
              disabled={notes.length === 0}
            >
              <Download className="h-4 w-4" />
              엑셀 다운로드
            </Button>
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

              <div>
                <Label htmlFor="explanation">해설</Label>
                <Textarea
                  id="explanation"
                  placeholder="왜 틀렸는지, 어떻게 풀어야 하는지 적어주세요"
                  value={newNote.explanation}
                  onChange={(e) => setNewNote({...newNote, explanation: e.target.value})}
                  rows={3}
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
              <Card key={note.id} className={note.isResolved ? "border-green-200 bg-green-50/50" : ""}>
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
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          해결완료
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-600" />
                          미해결
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">문제</h4>
                    <div className="bg-blue-50 p-4 rounded-lg border">
                      <p className="text-base leading-relaxed">{note.question}</p>
                    </div>
                  </div>

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
                        {note.wrongAnswer && (
                          <div>
                            <h4 className="font-medium mb-2 text-red-600 flex items-center gap-1">
                              <XCircle className="h-4 w-4" />
                              내가 적은 답
                            </h4>
                            <p className="text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                              {note.wrongAnswer}
                            </p>
                          </div>
                        )}
                        
                        <div>
                          <h4 className="font-medium mb-2 text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            정답
                          </h4>
                          <p className="text-sm bg-green-50 p-3 rounded-lg border border-green-200 font-medium">
                            {note.correctAnswer}
                          </p>
                        </div>
                      </div>

                      {note.explanation && (
                        <div>
                          <h4 className="font-medium mb-2">해설</h4>
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm leading-relaxed">{note.explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
