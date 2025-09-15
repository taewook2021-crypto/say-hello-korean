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
      setChapters(data?.map((chapter: any) => chapter.name) || []);
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
      
      setChapters([...chapters, newChapterName.trim()]);
      setNewChapterName("");
      setIsDialogOpen(false);
      toast({
        title: "성공",
        description: "새 단원이 추가되었습니다.",
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
                  <p className="text-sm font-medium">{chapter}</p>
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