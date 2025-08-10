import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Image } from 'lucide-react';
import { useOcr } from '@/hooks/useOcr';
import { useToast } from '@/hooks/use-toast';

interface OCRUploaderProps {
  onTextExtracted: (text: string) => void;
}

const SUPPORTED_FILES = [
  'image/png',
  'image/jpeg', 
  'image/jpg',
  'image/gif',
  'image/webp',
  'application/pdf'
];

export function OCRUploader({ onTextExtracted }: OCRUploaderProps) {
  const { toast } = useToast();
  const { processFile, isProcessing, progress } = useOcr();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [language, setLanguage] = useState('kor');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!SUPPORTED_FILES.includes(selectedFile.type)) {
      toast({
        title: '지원하지 않는 파일 형식',
        description: 'PNG, JPG, GIF, WebP, PDF 파일만 지원됩니다.',
        variant: 'destructive'
      });
      return;
    }

    setFile(selectedFile);
    
    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        handleFileSelect(new File([file], 'pasted-image.png', { type: file.type }));
      }
    }
  }, [handleFileSelect]);

  const processOCR = async () => {
    if (!file) return;

    try {
      const text = await processFile(file, { 
        language,
        dpi: 150 
      });
      
      if (text.trim()) {
        onTextExtracted(text);
        toast({
          title: 'OCR 완료',
          description: '텍스트가 성공적으로 추출되었습니다.'
        });
      } else {
        toast({
          title: '텍스트 없음',
          description: '이미지에서 텍스트를 찾을 수 없습니다.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'OCR 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          이미지/PDF에서 텍스트 추출
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Area */}
        <div
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center transition-colors hover:border-muted-foreground/50"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onPaste={handlePaste}
          tabIndex={0}
        >
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">파일을 드래그하거나 클릭하여 선택</p>
              <p className="text-sm text-muted-foreground">PNG, JPG, GIF, WebP, PDF 지원</p>
              <p className="text-xs text-muted-foreground mt-1">Ctrl+V로 클립보드 이미지 붙여넣기 가능</p>
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_FILES.join(',')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              파일 선택
            </Button>
          </div>
        </div>

        {/* File Preview */}
        {file && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {file.type.startsWith('image/') ? (
                  <Image className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFile} disabled={isProcessing}>
                제거
              </Button>
            </div>
            
            {preview && (
              <div className="flex justify-center">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="max-h-48 rounded-lg border"
                />
              </div>
            )}
          </div>
        )}

        {/* Language Selection */}
        <div className="space-y-2">
          <Label>인식 언어</Label>
          <Select value={language} onValueChange={setLanguage} disabled={isProcessing}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kor">한국어</SelectItem>
              <SelectItem value="eng">English</SelectItem>
              <SelectItem value="kor+eng">한국어 + English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Progress */}
        {isProcessing && progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{progress.status}</span>
              <span>{Math.round(progress.progress * 100)}%</span>
            </div>
            <Progress value={progress.progress * 100} />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={processOCR} 
            disabled={!file || isProcessing}
            className="flex-1"
          >
            {isProcessing ? '처리 중...' : 'OCR 실행'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}