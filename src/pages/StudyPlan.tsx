import React, { useState, useEffect } from "react";
import { Plus, BookOpen, Check, X, Edit2, Save, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

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
        // notes는 이제 문제번호만 포함 (접미사 없음)
        const problemNumber = item.notes || 'default';
        const key = `${item.subject_name}_${item.book_name}_${item.chapter_name}_${problemNumber}`;
        
        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            id: key,
            subject_name: item.subject_name,
            book_name: item.book_name,
            chapter_name: item.chapter_name,
            problem_number: problemNumber === 'default' ? '전체' : problemNumber,
            max_rounds: 3,
            rounds_completed: {},
            round_status: {},
            created_at: item.created_at
          });
        }
        
        const studyItem = itemsMap.get(key)!;
        studyItem.rounds_completed[item.round_number] = item.is_completed;
        
        // 새로운 status 필드를 사용하여 O/△/X 상태 확인
        if (item.status === 'correct') {
          studyItem.round_status[item.round_number] = 2; // O (맞춤)
        } else if (item.status === 'mistake') {
          studyItem.round_status[item.round_number] = 3; // △ (실수)
        } else if (item.status === 'wrong') {
          studyItem.round_status[item.round_number] = 4; // X (틀림)
        } else {
          studyItem.round_status[item.round_number] = 1; // 빈칸 (기본값)
        }
      });

      console.log('Processed items:', Array.from(itemsMap.values()));

      // 단원별로 문제를 그룹화하고 순서대로 번호 매기기
      const studyItemsArray = Array.from(itemsMap.values());
      const chapterGroups = new Map<string, StudyItem[]>();
      
      // 단원별로 그룹화
      studyItemsArray.forEach(item => {
        const chapterKey = `${item.subject_name}_${item.book_name}_${item.chapter_name}`;
        if (!chapterGroups.has(chapterKey)) {
          chapterGroups.set(chapterKey, []);
        }
        chapterGroups.get(chapterKey)!.push(item);
      });

      // 각 단원 내에서 문제번호 순으로 정렬하고 순차 번호 할당
      const finalStudyItems: StudyItem[] = [];
      chapterGroups.forEach((items, chapterKey) => {
        // 문제번호로 정렬 (숫자 형태로)
        items.sort((a, b) => {
          const numA = parseInt(a.problem_number) || 0;
          const numB = parseInt(b.problem_number) || 0;
          return numA - numB;
        });
        
        // 순차적으로 번호 재할당
        items.forEach((item, index) => {
          item.problem_number = (index + 1).toString();
          finalStudyItems.push(item);
        });
      });

      setStudyItems(finalStudyItems);

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

    console.log('Updating status:', { itemId, round, status, item });

    try {
      if (status === 0) {
        // 빈칸: 해당 round의 모든 기록 삭제
        const { error } = await supabase
          .from('study_progress')
          .delete()
          .eq('subject_name', item.subject_name)
          .eq('book_name', item.book_name)
          .eq('chapter_name', item.chapter_name)
          .eq('round_number', round)
          .like('notes', `${item.problem_number}%`);
        
        if (error) {
          console.error('Delete error:', error);
          throw error;
        }
        console.log('Deleted successfully');
      } else {
        // O(1), △(2), X(3): 회독 기록 업데이트/생성
        let notesSuffix = '';
        if (status === 2) notesSuffix = '_mistake';
        else if (status === 3) notesSuffix = '_wrong';
        
        const notes = `${item.problem_number}${notesSuffix}`;
        
        // 기존 기록 삭제 후 새로 삽입
        await supabase
          .from('study_progress')
          .delete()
          .eq('subject_name', item.subject_name)
          .eq('book_name', item.book_name)
          .eq('chapter_name', item.chapter_name)
          .eq('round_number', round)
          .like('notes', `${item.problem_number}%`);

        const { error } = await supabase
          .from('study_progress')
          .insert({
            subject_name: item.subject_name,
            book_name: item.book_name,
            chapter_name: item.chapter_name,
            round_number: round,
            notes: notes,
            is_completed: status === 1,
            completed_at: status === 1 ? new Date().toISOString() : null,
          });

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        console.log('Inserted successfully');
      }

      const statusText = ['삭제', 'O로 표시', '△로 표시', 'X로 표시'][status];
      toast.success(`${round}회독이 ${statusText}되었습니다.`);
      
      // 데이터 새로고침
      await loadData();
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
    setExpandedChapters(new Set());
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

  const toggleChapterExpansion = (chapterKey: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterKey)) {
      newExpanded.delete(chapterKey);
    } else {
      newExpanded.add(chapterKey);
    }
    setExpandedChapters(newExpanded);
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
    
    // 각 챕터 내에서 생성 시간 순으로 정렬 (일관된 순서 유지)
    Object.keys(grouped).forEach(subjectBookKey => {
      Object.keys(grouped[subjectBookKey].chapters).forEach(chapterName => {
        grouped[subjectBookKey].chapters[chapterName].sort((a, b) => {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
      });
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
      setExpandedChapters(new Set());
      
      // 데이터 새로고침
      loadData();
    } catch (error) {
      console.error('Error adding chapter:', error);
      toast.error('단원 추가 중 오류가 발생했습니다.');
    }
  };

  const updateStudyStatus = async (itemId: string, roundNumber: number, status: number) => {
    try {
      // 현재 아이템 찾기
      const currentItem = studyItems.find(item => item.id === itemId);
      if (!currentItem) {
        console.error('Current item not found:', itemId);
        return;
      }

      console.log('Updating status:', { itemId, roundNumber, status, currentItem });

      // 해당 문제의 해당 회독 기록 찾기 또는 생성
      const { data: existingRecord, error: selectError } = await supabase
        .from('study_progress')
        .select('*')
        .eq('subject_name', currentItem.subject_name)
        .eq('book_name', currentItem.book_name)
        .eq('chapter_name', currentItem.chapter_name)
        .eq('round_number', roundNumber)
        .eq('notes', currentItem.problem_number)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Select error:', selectError);
        throw selectError;
      }

      // 상태에 따른 업데이트 데이터 준비
      let statusValue = null;
      if (status === 2) statusValue = 'correct'; // O
      else if (status === 3) statusValue = 'mistake'; // △
      else if (status === 4) statusValue = 'wrong'; // X

      const updateData = {
        subject_name: currentItem.subject_name,
        book_name: currentItem.book_name,
        chapter_name: currentItem.chapter_name,
        round_number: roundNumber,
        notes: currentItem.problem_number, // 문제번호만 저장
        status: statusValue,
        is_completed: status === 2, // O인 경우만 완료로 표시
        completed_at: status === 2 ? new Date().toISOString() : null,
      };

      if (existingRecord) {
        // 기존 레코드 업데이트
        if (status === 1) {
          // 빈칸인 경우 레코드 삭제
          await supabase
            .from('study_progress')
            .delete()
            .eq('id', existingRecord.id);
        } else {
          // 상태 업데이트
          const { error } = await supabase
            .from('study_progress')
            .update(updateData)
            .eq('id', existingRecord.id);

          if (error) {
            console.error('Update error:', error);
            throw error;
          }
        }
      } else if (status !== 1) {
        // 새 레코드 생성 (빈칸이 아닌 경우만)
        const { error } = await supabase
          .from('study_progress')
          .insert(updateData);

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
      }

      // 상태 업데이트 후 데이터 새로고침
      await loadData();

      const statusText = { 1: '빈칸', 2: 'O', 3: '△', 4: 'X' }[status];
      toast.success(`${currentItem.problem_number}번 ${roundNumber}회독 상태가 ${statusText}로 변경되었습니다.`);
    } catch (error) {
      console.error('Error updating study status:', error);
      toast.error('상태 업데이트 중 오류가 발생했습니다.');
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
                      {Object.entries(data.chapters).map(([chapterName, items]) => {
                        const chapterKey = `${data.subject_name}_${data.book_name}_${chapterName}`;
                        const isExpanded = expandedChapters.has(chapterKey);
                        
                         return (
                          <React.Fragment key={chapterKey}>
                            {/* Chapter Header Row */}
                            <TableRow className="bg-muted/30 cursor-pointer hover:bg-muted/40" onClick={() => toggleChapterExpansion(chapterKey)}>
                              <TableCell className="font-semibold">
                                <div className="flex items-center gap-2">
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  {chapterName} ({items.length}문제)
                                </div>
                              </TableCell>
                              <TableCell colSpan={maxRoundsInData + 3} className="text-center text-muted-foreground">
                                {isExpanded ? '문제 목록 숨기기' : '문제 목록 보기'}
                              </TableCell>
                            </TableRow>
                            
                            {/* Chapter Items (only shown when expanded) */}
                            {isExpanded && items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="pl-8">{item.problem_number}번</TableCell>
                                {Array.from({ length: maxRoundsInData }, (_, roundIndex) => {
                                  const roundNumber = roundIndex + 1;
                                  const roundStatus = item.round_status?.[roundNumber.toString()] || 1;
                                  const statusMap = { 1: '', 2: 'O', 3: '△', 4: 'X' };
                                  
                                  return (
                                    <TableCell key={`${item.id}-round-${roundNumber}`} className="text-center">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            className="h-8 w-8 p-0 border border-border hover:bg-muted"
                                          >
                                            {statusMap[roundStatus]}
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                          <DropdownMenuItem 
                                            onClick={() => updateStudyStatus(item.id, roundNumber, 1)}
                                          >
                                            빈칸
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={() => updateStudyStatus(item.id, roundNumber, 2)}
                                          >
                                            O (맞춤)
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={() => updateStudyStatus(item.id, roundNumber, 3)}
                                          >
                                            △ (실수)
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={() => updateStudyStatus(item.id, roundNumber, 4)}
                                          >
                                            X (틀림)
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-center">
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(item.created_at).toLocaleDateString()}
                                  </span>
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
                        );
                      })}
                      
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