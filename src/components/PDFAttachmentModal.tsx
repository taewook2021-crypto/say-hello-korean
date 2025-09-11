import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';

interface PDFAttachmentModalProps {
  children: React.ReactNode;
}

export default function PDFAttachmentModal({ children }: PDFAttachmentModalProps) {
  const { subjects, subjectBooks, loading, refreshBooksForSubject } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [books, setBooks] = useState<{name: string}[]>([]);
  const [chapters, setChapters] = useState<{name: string}[]>([]);

  const filteredBooks = books.filter(book => 
    subjectBooks[selectedSubject]?.includes(book.name)
  );
  const filteredChapters = chapters;

  // 과목이 선택되면 책 목록 업데이트
  useEffect(() => {
    if (selectedSubject && subjectBooks[selectedSubject]) {
      setBooks(subjectBooks[selectedSubject].map(name => ({name})));
    } else {
      setBooks([]);
    }
    setSelectedBook('');
    setChapters([]);
    setSelectedChapter('');
  }, [selectedSubject, subjectBooks]);

  // 책이 선택되면 단원 목록 로드
  useEffect(() => {
    const loadChapters = async () => {
      if (selectedSubject && selectedBook) {
        try {
          const { data, error } = await supabase
            .from('chapters')
            .select('name')
            .eq('subject_name', selectedSubject)
            .eq('book_name', selectedBook);
          
          if (error) throw error;
          setChapters(data.map(chapter => ({name: chapter.name})));
        } catch (error) {
          console.error('Error loading chapters:', error);
          setChapters([]);
        }
      } else {
        setChapters([]);
      }
      setSelectedChapter('');
    };

    loadChapters();
  }, [selectedBook, selectedSubject]);
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      toast.error('PDF 파일만 업로드할 수 있습니다.');
    }
  };

  const handleUpload = async () => {
    if (!selectedSubject || !selectedBook || !selectedChapter || !selectedFile) {
      toast.error('모든 필드를 선택해주세요.');
      return;
    }

    setIsUploading(true);

    try {
      // 파일 경로 생성
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `${selectedSubject}/${selectedBook}/${selectedChapter}/${fileName}`;

      // Storage에 파일 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // 데이터베이스에 첨부 파일 정보 저장
      const { error: dbError } = await supabase
        .from('pdf_attachments')
        .insert({
          subject_name: selectedSubject,
          book_name: selectedBook,
          chapter_name: selectedChapter,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
        });

      if (dbError) throw dbError;

      toast.success('PDF가 성공적으로 첨부되었습니다.');
      
      // 폼 리셋
      setSelectedSubject('');
      setSelectedBook('');
      setSelectedChapter('');
      setSelectedFile(null);
      setIsOpen(false);

      // 입력 필드 리셋
      const fileInput = document.getElementById('pdf-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('PDF 업로드 에러:', error);
      toast.error('PDF 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>PDF 첨부</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 과목 선택 */}
          <div className="space-y-2">
            <Label htmlFor="subject">과목</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="과목을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 책 선택 */}
          <div className="space-y-2">
            <Label htmlFor="book">책</Label>
            <Select 
              value={selectedBook} 
              onValueChange={setSelectedBook}
              disabled={!selectedSubject}
            >
              <SelectTrigger>
                <SelectValue placeholder="책을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {filteredBooks.map((book) => (
                  <SelectItem key={book.name} value={book.name}>
                    {book.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 단원 선택 */}
          <div className="space-y-2">
            <Label htmlFor="chapter">단원</Label>
            <Select 
              value={selectedChapter} 
              onValueChange={setSelectedChapter}
              disabled={!selectedBook}
            >
              <SelectTrigger>
                <SelectValue placeholder="단원을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {filteredChapters.map((chapter) => (
                  <SelectItem key={chapter.name} value={chapter.name}>
                    {chapter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 파일 선택 */}
          <div className="space-y-2">
            <Label htmlFor="pdf-file">PDF 파일</Label>
            <Input
              id="pdf-file-input"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600">
                선택된 파일: {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
              </p>
            )}
          </div>

          {/* 업로드 버튼 */}
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || !selectedSubject || !selectedBook || !selectedChapter || !selectedFile}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                PDF 첨부하기
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}