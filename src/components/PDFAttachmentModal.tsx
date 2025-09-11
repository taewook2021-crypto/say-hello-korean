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
  const { subjects } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      toast.error('PDF 파일만 업로드할 수 있습니다.');
    }
  };

  const handleUpload = async () => {
    if (!selectedSubject || !selectedFile) {
      toast.error('과목과 파일을 선택해주세요.');
      return;
    }

    setIsUploading(true);

    try {
      // 파일 경로 생성 (URL-safe하게 변경)
      const safeSubjectName = encodeURIComponent(selectedSubject).replace(/%/g, '_');
      const safeFileName = encodeURIComponent(selectedFile.name).replace(/%/g, '_');
      const timestamp = Date.now();
      const fileName = `${timestamp}_${safeFileName}`;
      const filePath = `${safeSubjectName}/${fileName}`;

      // Storage에 파일 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // 데이터베이스에 첨부 파일 정보 저장 (과목만 저장)
      const { error: dbError } = await supabase
        .from('pdf_attachments')
        .insert({
          subject_name: selectedSubject,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
        });

      if (dbError) throw dbError;

      toast.success('PDF가 성공적으로 첨부되었습니다.');
      
      // 폼 리셋
      setSelectedSubject('');
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
            disabled={isUploading || !selectedSubject || !selectedFile}
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