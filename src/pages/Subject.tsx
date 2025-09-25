import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, BookOpen, Plus, MoreVertical, Trash2, Edit } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedData } from "@/contexts/UnifiedDataContext";
import { EditableText } from "@/components/EditableText";

const Subject = () => {
  const { subjectName } = useParams<{ subjectName: string }>();
  const [books, setBooks] = useState<string[]>([]);
  const [bookStats, setBookStats] = useState<{ [key: string]: { chapters: number; wrongNotes: number } }>({});
  const [newBookName, setNewBookName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteBookName, setDeleteBookName] = useState("");
  const { toast } = useToast();
  const { addBook, deleteBook, updateBook } = useUnifiedData();

  useEffect(() => {
    if (subjectName) {
      loadBooks();
    }
  }, [subjectName]);

  const loadBooks = async () => {
    try {
      console.log('Loading books for subject:', decodeURIComponent(subjectName || ''));
      const { data, error } = await (supabase as any)
        .from('books')
        .select('name')
        .eq('subject_name', decodeURIComponent(subjectName || ''))
        .order('name');
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Books loaded:', data);
      const bookNames = data?.map((book: any) => book.name) || [];
      setBooks(bookNames);
      
      // Load stats for each book
      const stats: { [key: string]: { chapters: number; wrongNotes: number } } = {};
      for (const bookName of bookNames) {
        stats[bookName] = await getBookStats(bookName);
      }
      setBookStats(stats);
    } catch (error) {
      console.error('Error loading books:', error);
      // If database tables don't exist yet, start with empty array
      setBooks([]);
      toast({
        title: "알림",
        description: "데이터베이스 설정이 필요합니다. 교재 추가는 임시로 로컬에만 저장됩니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getBookStats = async (bookName: string) => {
    try {
      // 단원 수 조회
      const { data: chaptersData } = await (supabase as any)
        .from('chapters')
        .select('id')
        .eq('subject_name', decodeURIComponent(subjectName || ''))
        .eq('book_name', bookName);
      
      // 오답노트 수 조회
      const { data: wrongNotesData } = await (supabase as any)
        .from('wrong_notes')
        .select('id')
        .eq('subject_name', decodeURIComponent(subjectName || ''))
        .eq('book_name', bookName);

      return {
        chapters: chaptersData?.length || 0,
        wrongNotes: wrongNotesData?.length || 0
      };
    } catch (error) {
      console.error('Error loading book stats:', error);
      return { chapters: 0, wrongNotes: 0 };
    }
  };

  const handleAddBook = async () => {
    if (!newBookName.trim() || !subjectName) return;
    
    try {
      await addBook(decodeURIComponent(subjectName), newBookName.trim());
      setBooks([...books, newBookName.trim()]);
      setNewBookName("");
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error adding book:', error);
      // addBook에서 이미 오류 토스트를 표시하므로 여기서는 로컬 상태만 업데이트
      setBooks([...books, newBookName.trim()]);
      setNewBookName("");
      setIsDialogOpen(false);
    }
  };

  const handleDeleteBook = async (bookName: string) => {
    try {
      await deleteBook(decodeURIComponent(subjectName || ''), bookName);
      setBooks(books.filter(book => book !== bookName));
      setShowDeleteDialog(false);
    } catch (error) {
      // Error already handled in context
    }
  };

  const openDeleteDialog = (bookName: string) => {
    setDeleteBookName(bookName);
    setShowDeleteDialog(true);
  };

  const handleUpdateBook = async (oldName: string, newName: string) => {
    if (!subjectName || !newName.trim() || oldName === newName.trim()) return;
    
    try {
      await updateBook(decodeURIComponent(subjectName), oldName, newName.trim());
      setBooks(books.map(book => book === oldName ? newName.trim() : book));
    } catch (error) {
      console.error('Error updating book:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <Link to="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{decodeURIComponent(subjectName || "")}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 교재 추가</DialogTitle>
              <DialogDescription>새로운 교재를 추가합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bookName">교재 이름</Label>
                <Input
                  id="bookName"
                  value={newBookName}
                  onChange={(e) => setNewBookName(e.target.value)}
                  placeholder="교재 이름을 입력하세요"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddBook();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleAddBook}>
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
          books.map((book, index) => (
            <div key={index} className="relative group">
              <Card className="p-4 text-center hover:bg-accent">
                <CardContent className="p-0">
                  <BookOpen className="h-12 w-12 text-primary mx-auto mb-2" />
                   <div className="mb-2">
                     <EditableText
                       text={book}
                       onSave={(newName) => handleUpdateBook(book, newName)}
                       className="text-sm font-medium"
                       placeholder="교재명을 입력하세요"
                       centered={true}
                     />
                   </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>단원: {bookStats[book]?.chapters || 0}개</div>
                    <div>오답노트: {bookStats[book]?.wrongNotes || 0}개</div>
                  </div>
                  
                  {/* 카드 하단에 이동 버튼 추가 */}
                  <div className="mt-3 pt-3 border-t">
                    <Link to={`/subject/${subjectName}/book/${encodeURIComponent(book)}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        교재 열기
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
              
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openDeleteDialog(book)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>
      
      {!loading && books.length === 0 && (
        <div className="text-center text-muted-foreground mt-12">
          <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>아직 추가된 교재가 없습니다.</p>
          <p>+ 버튼을 눌러 교재를 추가해보세요.</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteBookName}</strong> 책을 삭제하면 관련된 모든 데이터가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDeleteBook(deleteBookName)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Subject;