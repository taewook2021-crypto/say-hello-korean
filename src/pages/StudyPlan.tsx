import React, { useState, useEffect } from "react";
import { Plus, BookOpen, Check, X, Edit2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface StudyItem {
  id: string;
  subject_name: string;
  book_name: string;
  chapter_name: string;
  problem_number: string;
  max_rounds: number;
  rounds_completed: { [round: number]: boolean };
  round_status: { [round: number]: number }; // 0=빈칸, 1=O, 2=△, 3=X
  created_at: string;
}

interface Book {
  name: string;
  subject_name: string;
}

interface Chapter {
  name: string;
  book_name: string;
  subject_name: string;
}

interface GroupedData {
  [subjectAndBook: string]: {
    subject_name: string;
    book_name: string;
    chapters: {
      [chapter: string]: StudyItem[];
    };
  };
}

export default function StudyPlan() {
  const [studyItems, setStudyItems] = useState<StudyItem[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedBook, setSelectedBook] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [problemNumbers, setProblemNumbers] = useState("");
  const [maxRounds, setMaxRounds] = useState(3);
  const [newChapterName, setNewChapterName] = useState("");
  const [problemCount, setProblemCount] = useState(1);
  const [showInlineChapterAdd, setShowInlineChapterAdd] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load study progress data
      const { data: progressData, error: progressError } = await supabase
        .from('study_progress')
        .select('*')
        .order('created_at', { ascending: false });

      if (progressError) throw progressError;

      // Group by study item and create rounds_completed object
      const itemsMap = new Map<string, StudyItem>();
      
      progressData?.forEach((item) => {
        const key = `${item.subject_name}_${item.book_name}_${item.chapter_name}_${item.notes || 'default'}`;
        
        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            id: key,
            subject_name: item.subject_name,
            book_name: item.book_name,
            chapter_name: item.chapter_name,
            problem_number: item.notes || '전체',
            max_rounds: 3,
            rounds_completed: {},
            round_status: {},
            created_at: item.created_at
          });
        }
        
        const studyItem = itemsMap.get(key)!;
        studyItem.rounds_completed[item.round_number] = item.is_completed;
        
        // O/△/X 상태 확인
        if (item.notes && item.notes.includes('_wrong')) {
          studyItem.round_status[item.round_number] = 3; // X (아예 틀림)
        } else if (item.notes && item.notes.includes('_mistake')) {
          studyItem.round_status[item.round_number] = 2; // △ (실수)
        } else if (item.is_completed) {
          studyItem.round_status[item.round_number] = 1; // O (맞음)
        } else {
          studyItem.round_status[item.round_number] = 0; // 빈칸
        }
        
        studyItem.max_rounds = Math.max(studyItem.max_rounds, item.round_number);
      });

      // Load books
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('name, subject_name')
        .order('subject_name', { ascending: true });

      if (booksError) throw booksError;

      // Load chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('name, book_name, subject_name')
        .order('subject_name', { ascending: true });

      if (chaptersError) throw chaptersError;

      setStudyItems(Array.from(itemsMap.values()));
      setBooks(booksData || []);
      setChapters(chaptersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('데이터 로드 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudyItem = async () => {
    if (!selectedSubject || !selectedBook || !selectedChapter || !problemCount) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const allStudyPlans = [];

      // 1번부터 problemCount까지 문제 생성
      for (let problemNum = 1; problemNum <= problemCount; problemNum++) {
        for (let round = 1; round <= maxRounds; round++) {
          allStudyPlans.push({
            subject_name: selectedSubject,
            book_name: selectedBook,
            chapter_name: selectedChapter,
            round_number: round,
            notes: problemNum.toString(),
            is_completed: false
          });
        }
      }

      const { error } = await supabase
        .from('study_progress')
        .insert(allStudyPlans);

      if (error) throw error;

      // Create chapter if it doesn't exist
      const { error: chapterError } = await supabase
        .from('chapters')
        .upsert({
          name: selectedChapter,
          book_name: selectedBook,
          subject_name: selectedSubject
        }, {
          onConflict: 'name,book_name,subject_name'
        });

      if (chapterError) console.warn('Chapter creation error:', chapterError);

      toast.success('회독표 항목이 추가되었습니다.');
      setIsDialogOpen(false);
      loadData();
      
      // Reset form
      setSelectedSubject("");
      setSelectedBook("");
      setSelectedChapter("");
      setProblemCount(1);
      setMaxRounds(3);
    } catch (error) {
      console.error('Error adding study item:', error);
      toast.error('항목 추가 중 오류가 발생했습니다.');
    }
  };

  const handleStatusUpdate = async (itemId: string, round: number, status: number) => {
    const item = studyItems.find(i => i.id === itemId);
    if (!item) return;

    try {
      let updateData: any = {};
      
      if (status === 0) {
        // 빈칸: 회독 기록 삭제
        const { error } = await supabase
          .from('study_progress')
          .delete()
          .eq('subject_name', item.subject_name)
          .eq('book_name', item.book_name)
          .eq('chapter_name', item.chapter_name)
          .eq('round_number', round)
          .eq('notes', item.problem_number === '전체' ? null : item.problem_number);
        
        if (error) throw error;
      } else {
        // O(1), △(2), X(3): 회독 기록 업데이트/생성
        let notesSuffix = '';
        if (status === 2) notesSuffix = '_mistake';
        else if (status === 3) notesSuffix = '_wrong';
        
        updateData = {
          is_completed: status === 1, // O일 때만 완료로 표시
          completed_at: status === 1 ? new Date().toISOString() : null,
        };

        const notes = item.problem_number === '전체' ? 
          (notesSuffix ? notesSuffix : null) : 
          `${item.problem_number}${notesSuffix}`;

        const { error } = await supabase
          .from('study_progress')
          .upsert({
            subject_name: item.subject_name,
            book_name: item.book_name,
            chapter_name: item.chapter_name,
            round_number: round,
            notes: notes,
            ...updateData
          });

        if (error) throw error;
      }

      const statusText = ['삭제', 'O로 표시', '△로 표시', 'X로 표시'][status];
      toast.success(`${round}회독이 ${statusText}되었습니다.`);
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('상태 업데이트 중 오류가 발생했습니다.');
    }
  };

  const deleteStudyItem = async (item: StudyItem) => {
    try {
      // notes 필드가 null인지 확인하여 적절한 조건으로 삭제
      let query = supabase
        .from('study_progress')
        .delete()
        .eq('subject_name', item.subject_name)
        .eq('book_name', item.book_name)
        .eq('chapter_name', item.chapter_name);

      // notes 필드에 따른 조건 처리
      if (item.problem_number === '전체' || !item.problem_number) {
        query = query.is('notes', null);
      } else {
        query = query.eq('notes', item.problem_number);
      }

      const { error } = await query;

      if (error) throw error;

      toast.success('항목이 삭제되었습니다.');
      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  const getUniqueSubjects = () => {
    return [...new Set(books.map(book => book.subject_name))];
  };

  const getBooksBySubject = (subject: string) => {
    return books.filter(book => book.subject_name === subject);
  };

  const getChaptersByBook = (subject: string, book: string) => {
    return chapters.filter(chapter => 
      chapter.subject_name === subject && chapter.book_name === book
    );
  };

  const getGroupedData = (): GroupedData => {
    const grouped: GroupedData = {};
    
    studyItems.forEach(item => {
      const subjectBookKey = `${item.subject_name}_${item.book_name}`;
      
      if (!grouped[subjectBookKey]) {
        grouped[subjectBookKey] = {
          subject_name: item.subject_name,
          book_name: item.book_name,
          chapters: {}
        };
      }
      
      if (!grouped[subjectBookKey].chapters[item.chapter_name]) {
        grouped[subjectBookKey].chapters[item.chapter_name] = [];
      }
      
      grouped[subjectBookKey].chapters[item.chapter_name].push(item);
    });
    
    return grouped;
  };

  const handleInlineChapterAdd = async (subjectName: string, bookName: string) => {
    if (!newChapterName || !problemCount) {
      toast.error('단원명과 문제 수를 입력해주세요.');
      return;
    }

    try {
      const allStudyPlans = [];

      // 1번부터 problemCount까지 문제 생성
      for (let problemNum = 1; problemNum <= problemCount; problemNum++) {
        for (let round = 1; round <= 3; round++) {
          allStudyPlans.push({
            subject_name: subjectName,
            book_name: bookName,
            chapter_name: newChapterName,
            round_number: round,
            notes: problemNum.toString(),
            is_completed: false
          });
        }
      }

      const { error } = await supabase
        .from('study_progress')
        .insert(allStudyPlans);

      if (error) throw error;

      // Create chapter if it doesn't exist
      const { error: chapterError } = await supabase
        .from('chapters')
        .upsert({
          name: newChapterName,
          book_name: bookName,
          subject_name: subjectName
        }, {
          onConflict: 'name,book_name,subject_name'
        });

      if (chapterError) console.warn('Chapter creation error:', chapterError);

      toast.success('단원이 추가되었습니다.');
      setShowInlineChapterAdd(null);
      setNewChapterName("");
      setProblemCount(1);
      loadData();
    } catch (error) {
      console.error('Error adding chapter:', error);
      toast.error('단원 추가 중 오류가 발생했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const groupedData = getGroupedData();
  const maxRoundsInData = Math.max(...studyItems.map(item => item.max_rounds), 3);

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">회독표</h1>
          <p className="text-muted-foreground">문제별 회독 현황을 체크하세요</p>
          <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
            <span><span className="font-mono font-bold">O</span>: 맞춘 문제</span>
            <span><span className="font-mono font-bold">△</span>: 실수한 문제</span>
            <span><span className="font-mono font-bold">X</span>: 아예 틀린 문제</span>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              항목 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>회독표 항목 추가</DialogTitle>
              <DialogDescription>
                과목, 교재, 단원을 선택하고 문제 번호를 입력하세요.
                <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-1">표시 가이드라인:</p>
                  <p><span className="font-mono">O</span> - 맞춘 문제</p>
                  <p><span className="font-mono">△</span> - 실수한 문제 (개념은 알지만 계산 실수 등)</p>
                  <p><span className="font-mono">X</span> - 아예 틀린 문제 (개념 모름)</p>
                  <p><span className="font-mono">빈칸</span> - 아직 안 푼 문제</p>
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">과목</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="과목을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {getUniqueSubjects().map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSubject && (
                <div>
                  <Label htmlFor="book">교재</Label>
                  <Select value={selectedBook} onValueChange={setSelectedBook}>
                    <SelectTrigger>
                      <SelectValue placeholder="교재를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {getBooksBySubject(selectedSubject).map((book) => (
                        <SelectItem key={book.name} value={book.name}>
                          {book.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedBook && (
                <div>
                  <Label htmlFor="chapter">단원</Label>
                  <Select value={selectedChapter} onValueChange={setSelectedChapter}>
                    <SelectTrigger>
                      <SelectValue placeholder="단원을 선택하거나 새로 입력하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {getChaptersByBook(selectedSubject, selectedBook).map((chapter) => (
                        <SelectItem key={chapter.name} value={chapter.name}>
                          {chapter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input 
                    className="mt-2" 
                    placeholder="새 단원명을 입력하세요"
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="problems">문제 수</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="이 단원의 총 문제 수를 입력하세요"
                  value={problemCount}
                  onChange={(e) => setProblemCount(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  1번부터 {problemCount}번까지 자동으로 생성됩니다
                </p>
              </div>

              <div>
                <Label htmlFor="rounds">목표 회독수</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={maxRounds}
                  onChange={(e) => setMaxRounds(parseInt(e.target.value) || 1)}
                />
              </div>

              <Button onClick={handleAddStudyItem} className="w-full">
                항목 추가
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Study Tables by Subject/Book */}
      {Object.keys(groupedData).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">회독표가 비어있습니다</h3>
            <p className="text-muted-foreground mb-4">
              첫 번째 항목을 추가해보세요
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              항목 추가
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedData).map(([subjectBookKey, data]) => (
            <Card key={subjectBookKey}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  {data.subject_name} - {data.book_name}
                </CardTitle>
                <CardDescription>
                  단원별 문제 회독 현황
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">단원 / 문제</TableHead>
                        {Array.from({ length: maxRoundsInData }, (_, i) => (
                          <TableHead key={i + 1} className="text-center w-20">
                            {i + 1}회독
                          </TableHead>
                        ))}
                        <TableHead className="text-center w-24">진도율</TableHead>
                        <TableHead className="text-center w-24">오답노트</TableHead>
                        <TableHead className="text-center w-20">삭제</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(data.chapters).map(([chapterName, items]) => (
                        <React.Fragment key={chapterName}>
                           {/* Chapter Header Row */}
                          <TableRow className="bg-muted/30">
                            <TableCell className="font-semibold">
                              {chapterName} ({items.length}문제)
                            </TableCell>
                            <TableCell colSpan={maxRoundsInData + 3} className="text-center text-muted-foreground">
                              <Link 
                                to={`/notes/${encodeURIComponent(data.subject_name)}/${encodeURIComponent(data.book_name)}/${encodeURIComponent(chapterName)}`}
                              >
                                <Button variant="ghost" size="sm">
                                  오답노트 보기
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                          
                          {/* Problem Rows */}
                          {items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="pl-8 text-muted-foreground">
                                {item.problem_number}번
                              </TableCell>
                              {Array.from({ length: maxRoundsInData }, (_, i) => {
                                const round = i + 1;
                                const status = item.round_status[round] || 0; // 0=빈칸, 1=O, 2=△, 3=X
                                
                                return (
                                  <TableCell key={round} className="text-center">
                                    <button
                                      className="w-8 h-8 border border-border rounded text-sm font-medium hover:bg-accent transition-colors flex items-center justify-center"
                                      onClick={() => {
                                        // 빈칸(0) → O(1) → △(2) → X(3) → 빈칸(0) 순환
                                        const nextStatus = (status + 1) % 4;
                                        handleStatusUpdate(item.id, round, nextStatus);
                                      }}
                                    >
                                      {status === 1 ? 'O' : status === 2 ? '△' : status === 3 ? 'X' : ''}
                                    </button>
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-center">
                                <Badge variant="outline">
                                  {Math.round((Object.values(item.rounds_completed).filter(Boolean).length / item.max_rounds) * 100)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Link 
                                  to={`/notes/${encodeURIComponent(item.subject_name)}/${encodeURIComponent(item.book_name)}/${encodeURIComponent(item.chapter_name)}`}
                                >
                                  <Button variant="outline" size="sm">
                                    보기
                                  </Button>
                                </Link>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteStudyItem(item)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                      
                      {/* Add Chapter Row */}
                      {showInlineChapterAdd === `${data.subject_name}_${data.book_name}` ? (
                        <TableRow>
                          <TableCell>
                            <div className="flex gap-2">
                              <Input
                                placeholder="새 단원명"
                                value={newChapterName}
                                onChange={(e) => setNewChapterName(e.target.value)}
                                className="h-8"
                              />
                              <Input
                                type="number"
                                min="1"
                                placeholder="문제수"
                                value={problemCount}
                                onChange={(e) => setProblemCount(parseInt(e.target.value) || 1)}
                                className="h-8 w-20"
                              />
                            </div>
                          </TableCell>
                          <TableCell colSpan={maxRoundsInData + 3}>
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                onClick={() => handleInlineChapterAdd(data.subject_name, data.book_name)}
                              >
                                <Save className="w-4 h-4 mr-2" />
                                저장
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setShowInlineChapterAdd(null);
                                  setNewChapterName("");
                                  setProblemCount(1);
                                }}
                              >
                                <X className="w-4 h-4 mr-2" />
                                취소
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={maxRoundsInData + 4} className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setShowInlineChapterAdd(`${data.subject_name}_${data.book_name}`)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              단원 추가
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}