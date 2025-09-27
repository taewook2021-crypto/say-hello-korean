import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MoveWrongNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  currentSubject: string;
  currentBook: string;
  currentChapter: string;
  onMoveSuccess: () => void;
}

interface BookChapter {
  bookName: string;
  chapters: string[];
}

export function MoveWrongNoteDialog({
  open,
  onOpenChange,
  noteId,
  currentSubject,
  currentBook,
  currentChapter,
  onMoveSuccess
}: MoveWrongNoteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [availableBooks, setAvailableBooks] = useState<BookChapter[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadAvailableDestinations();
    }
  }, [open, currentSubject]);

  const loadAvailableDestinations = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all books in the current subject
      const { data: books, error: booksError } = await supabase
        .from('books')
        .select('name')
        .eq('subject_name', currentSubject)
        .eq('user_id', user.id)
        .order('name');

      if (booksError) throw booksError;

      // Get chapters for each book
      const bookChapters: BookChapter[] = [];
      
      for (const book of books || []) {
        const { data: chapters, error: chaptersError } = await supabase
          .from('chapters')
          .select('name')
          .eq('subject_name', currentSubject)
          .eq('book_name', book.name)
          .eq('user_id', user.id)
          .order('name');

        if (chaptersError) {
          console.error('Error loading chapters for book:', book.name, chaptersError);
          continue;
        }

        if (chapters && chapters.length > 0) {
          bookChapters.push({
            bookName: book.name,
            chapters: chapters.map(c => c.name)
          });
        }
      }

      setAvailableBooks(bookChapters);
    } catch (error) {
      console.error('Error loading destinations:', error);
      toast({
        title: "오류",
        description: "이동 가능한 위치를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async () => {
    if (!selectedBook || !selectedChapter) {
      toast({
        title: "선택 필요",
        description: "이동할 책과 단원을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Prevent moving to the same location
    if (selectedBook === currentBook && selectedChapter === currentChapter) {
      toast({
        title: "동일한 위치",
        description: "현재 위치와 같은 곳으로는 이동할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setMoving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update the wrong note's location
      const { error: updateError } = await supabase
        .from('wrong_notes')
        .update({
          book_name: selectedBook,
          chapter_name: selectedChapter,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "이동 완료",
        description: `오답노트가 ${selectedBook} > ${selectedChapter}로 이동되었습니다.`,
      });

      onMoveSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error moving note:', error);
      toast({
        title: "이동 실패",
        description: "오답노트 이동에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setMoving(false);
    }
  };

  const getAvailableChapters = () => {
    if (!selectedBook) return [];
    const book = availableBooks.find(b => b.bookName === selectedBook);
    return book?.chapters || [];
  };

  const isCurrentLocation = (book: string, chapter: string) => {
    return book === currentBook && chapter === currentChapter;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>오답노트 이동</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Location */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <Label className="text-sm font-medium text-muted-foreground">현재 위치</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{currentSubject}</Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Badge variant="outline">{currentBook}</Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Badge variant="outline">{currentChapter}</Badge>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">이동 가능한 위치를 불러오는 중...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Book Selection */}
              <div className="space-y-2">
                <Label htmlFor="book-select">이동할 책 선택</Label>
                <Select value={selectedBook} onValueChange={setSelectedBook}>
                  <SelectTrigger>
                    <SelectValue placeholder="책을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBooks.map((book) => (
                      <SelectItem key={book.bookName} value={book.bookName}>
                        {book.bookName}
                        {book.bookName === currentBook && (
                          <Badge variant="secondary" className="ml-2 text-xs">현재</Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chapter Selection */}
              <div className="space-y-2">
                <Label htmlFor="chapter-select">이동할 단원 선택</Label>
                <Select 
                  value={selectedChapter} 
                  onValueChange={setSelectedChapter}
                  disabled={!selectedBook}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="단원을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableChapters().map((chapter) => (
                      <SelectItem 
                        key={chapter} 
                        value={chapter}
                        disabled={isCurrentLocation(selectedBook, chapter)}
                      >
                        {chapter}
                        {isCurrentLocation(selectedBook, chapter) && (
                          <Badge variant="secondary" className="ml-2 text-xs">현재 위치</Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Location Preview */}
              {selectedBook && selectedChapter && (
                <div className="p-4 border rounded-lg bg-primary/5">
                  <Label className="text-sm font-medium text-primary">이동할 위치</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="default">{currentSubject}</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="default">{selectedBook}</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="default">{selectedChapter}</Badge>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button 
            onClick={handleMove} 
            disabled={!selectedBook || !selectedChapter || moving || loading}
          >
            {moving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                이동 중...
              </>
            ) : (
              '이동하기'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}