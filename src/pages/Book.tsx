import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Book = () => {
  const { subjectName, bookName } = useParams<{ subjectName: string; bookName: string }>();
  const [chapters, setChapters] = useState<string[]>([]);
  const [chapterStats, setChapterStats] = useState<{ [key: string]: number }>({});
  const [newChapterName, setNewChapterName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (subjectName && bookName) {
      loadChapters();
    }
  }, [subjectName, bookName]);

  const loadChapters = async () => {
    try {
      console.log('Loading chapters for book:', decodeURIComponent(bookName || ''), 'in subject:', decodeURIComponent(subjectName || ''));
      const { data, error } = await (supabase as any)
        .from('chapters')
        .select('name')
        .eq('subject_name', decodeURIComponent(subjectName || ''))
        .eq('book_name', decodeURIComponent(bookName || ''))
        .order('name');
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Chapters loaded:', data);
      const chapterNames = data?.map((chapter: any) => chapter.name) || [];
      setChapters(chapterNames);
      
      // Load wrong note counts for each chapter
      const stats: { [key: string]: number } = {};
      for (const chapterName of chapterNames) {
        const { data: wrongNotesData } = await (supabase as any)
          .from('wrong_notes')
          .select('id')
          .eq('subject_name', decodeURIComponent(subjectName || ''))
          .eq('book_name', decodeURIComponent(bookName || ''))
          .eq('chapter_name', chapterName);
        stats[chapterName] = wrongNotesData?.length || 0;
      }
      setChapterStats(stats);
    } catch (error) {
      console.error('Error loading chapters:', error);
      // If database tables don't exist yet, start with empty array
      setChapters([]);
      toast({
        title: "알림",
        description: "데이터베이스 설정이 필요합니다. 단원 추가는 임시로 로컬에만 저장됩니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddChapter = async () => {
    if (!newChapterName.trim() || !subjectName || !bookName) return;
    
    try {
      console.log('Adding chapter:', newChapterName.trim(), 'to book:', decodeURIComponent(bookName), 'in subject:', decodeURIComponent(subjectName));
      
      // 1. 데이터베이스에 단원 추가
      const { error } = await (supabase as any)
        .from('chapters')
        .insert({ 
          name: newChapterName.trim(),
          subject_name: decodeURIComponent(subjectName),
          book_name: decodeURIComponent(bookName)
        });
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      // 2. 회독표에도 단원 추가
      await addChapterToStudyTracker(
        decodeURIComponent(subjectName), 
        decodeURIComponent(bookName), 
        newChapterName.trim()
      );
      
      setChapters([...chapters, newChapterName.trim()]);
      setNewChapterName("");
      setIsDialogOpen(false);
      toast({
        title: "성공",
        description: "새 단원이 추가되고 회독표에도 연동되었습니다.",
      });
    } catch (error) {
      console.error('Error adding chapter:', error);
      // If database doesn't exist, still add locally
      setChapters([...chapters, newChapterName.trim()]);
      setNewChapterName("");
      setIsDialogOpen(false);
      toast({
        title: "임시 저장",
        description: "단원이 임시로 추가되었습니다. 데이터베이스 설정 후 영구 저장됩니다.",
      });
    }
  };

  // 회독표에 단원 추가하는 함수
  const addChapterToStudyTracker = async (subjectName: string, bookName: string, chapterName: string) => {
    try {
      // 로컬 스토리지에서 회독표 데이터 가져오기
      const savedData = localStorage.getItem('aro-study-data');
      if (!savedData) {
        // 회독표가 없으면 새로 생성
        await createStudyPlanIfNotExists(subjectName, bookName);
      }
      
      const studyData = savedData ? JSON.parse(savedData) : [];
      
      // 해당 과목과 교재의 회독표 찾기
      const subjectIndex = studyData.findIndex((s: any) => s.name === subjectName);
      if (subjectIndex === -1) {
        await createStudyPlanIfNotExists(subjectName, bookName);
        return;
      }
      
      const bookIndex = studyData[subjectIndex].books.findIndex((b: any) => b.name === bookName);
      if (bookIndex === -1) {
        await createStudyPlanIfNotExists(subjectName, bookName);
        return;
      }
      
      // 단원이 이미 존재하는지 확인
      const existingChapter = studyData[subjectIndex].books[bookIndex].studyData.chapters
        .find((ch: any) => ch.name === chapterName);
      
      if (existingChapter) {
        console.log('Chapter already exists in study tracker');
        return;
      }
      
      // 새 단원 추가 (기본 30문제로 설정)
      const newChapter = {
        order: studyData[subjectIndex].books[bookIndex].studyData.chapters.length + 1,
        name: chapterName,
        problems: Array.from({ length: 30 }, (_, i) => ({
          number: i + 1,
          rounds: {},
          hasNote: false
        }))
      };
      
      studyData[subjectIndex].books[bookIndex].studyData.chapters.push(newChapter);
      
      // 로컬 스토리지에 저장
      localStorage.setItem('aro-study-data', JSON.stringify(studyData));
      
      console.log('Chapter added to study tracker successfully');
    } catch (error) {
      console.error('Error adding chapter to study tracker:', error);
    }
  };

  // 회독표가 없으면 생성하는 함수
  const createStudyPlanIfNotExists = async (subjectName: string, bookName: string) => {
    try {
      const savedData = localStorage.getItem('aro-study-data');
      const studyData = savedData ? JSON.parse(savedData) : [];
      
      const newStudyData = {
        id: Date.now().toString(),
        subject: subjectName,
        textbook: bookName,
        maxRounds: 3, // 기본 3회독
        chapters: [],
        createdAt: new Date().toISOString()
      };
      
      let updatedSubjects = [...studyData];
      
      // 기존 과목이 있는지 확인
      const existingSubjectIndex = updatedSubjects.findIndex((s: any) => s.name === subjectName);
      
      if (existingSubjectIndex >= 0) {
        // 기존 과목에 새 교재 추가
        const existingBookIndex = updatedSubjects[existingSubjectIndex].books
          .findIndex((b: any) => b.name === bookName);
        
        if (existingBookIndex === -1) {
          updatedSubjects[existingSubjectIndex].books.push({
            name: bookName,
            studyData: newStudyData,
            isExpanded: false
          });
        }
      } else {
        // 새 과목 생성
        updatedSubjects.push({
          name: subjectName,
          books: [{
            name: bookName,
            studyData: newStudyData,
            isExpanded: false
          }],
          isExpanded: true
        });
      }
      
      localStorage.setItem('aro-study-data', JSON.stringify(updatedSubjects));
      console.log('Study plan created for', subjectName, '-', bookName);
    } catch (error) {
      console.error('Error creating study plan:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <Link to={`/subject/${subjectName}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>
        </Link>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{decodeURIComponent(subjectName || "")}</p>
          <h1 className="text-2xl font-bold">{decodeURIComponent(bookName || "")}</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 단원 추가</DialogTitle>
              <DialogDescription>새로운 단원을 추가합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="chapterName">단원 이름</Label>
                <Input
                  id="chapterName"
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  placeholder="단원 이름을 입력하세요"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddChapter();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleAddChapter}>
                  추가
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-4 text-center animate-pulse">
              <CardContent className="p-0">
                <div className="h-12 w-12 bg-muted rounded mx-auto mb-2" />
                <div className="h-4 bg-muted rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          chapters.map((chapter, index) => (
            <Link key={index} to={`/notes/${encodeURIComponent(subjectName || '')}/${encodeURIComponent(bookName || '')}/${encodeURIComponent(chapter)}`}>
              <Card className="p-4 text-center cursor-pointer hover:bg-accent">
                <CardContent className="p-0">
                  <FileText className="h-12 w-12 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium mb-2">{chapter}</p>
                  <div className="text-xs text-muted-foreground">
                    오답노트: {chapterStats[chapter] || 0}개
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
      
      {!loading && chapters.length === 0 && (
        <div className="text-center text-muted-foreground mt-12">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>아직 추가된 단원이 없습니다.</p>
          <p>+ 버튼을 눌러 단원을 추가해보세요.</p>
        </div>
      )}
    </div>
  );
};

export default Book;