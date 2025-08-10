import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Image, ArrowDown, Edit, Check, X } from 'lucide-react';
import { useOcr } from '@/hooks/useOcr';
import { useToast } from '@/hooks/use-toast';

interface OCRUploaderProps {
  onTextExtracted: (text: string, target: 'question' | 'wrongAnswer' | 'correctAnswer') => void;
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
  const [enhance, setEnhance] = useState(true);
  const [extractedText, setExtractedText] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    setExtractedText('');
    
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
        dpi: 200,
        enhance
      });
      
      if (text.trim()) {
        setExtractedText(text);
        toast({
          title: 'OCR 완료',
          description: '텍스트가 추출되었습니다. 원하는 부분을 선택하세요.'
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

  const addToField = (target: 'question' | 'wrongAnswer' | 'correctAnswer') => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selected = extractedText.substring(start, end);
      
      if (selected.trim()) {
        onTextExtracted(selected.trim(), target);
        toast({
          title: '텍스트 추가됨',
          description: `선택한 텍스트가 ${target === 'question' ? '문제' : target === 'wrongAnswer' ? '오답' : '정답'}란에 추가되었습니다.`
        });
      } else {
        toast({
          title: '텍스트를 선택하세요',
          description: '추가할 텍스트를 먼저 선택해주세요.',
          variant: 'destructive'
        });
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setExtractedText('');
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
              <p className="text-xs text-muted-foreground mt-1">
                <Badge variant="secondary" className="mr-1">TIP</Badge>
                고해상도 이미지일수록 정확도가 높아집니다
              </p>
              <p className="text-xs text-muted-foreground">Ctrl+V로 클립보드 이미지 붙여넣기 가능</p>
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

        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>인식 언어</Label>
            <Select value={language} onValueChange={setLanguage} disabled={isProcessing}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
              <SelectItem value="kor">
                <div className="flex items-center gap-2">
                  <span>한국어</span>
                  <Badge variant="default" className="text-xs">권장</Badge>
                </div>
              </SelectItem>
              <SelectItem value="kor+eng">
                <div className="flex items-center gap-2">
                  <span>한국어 + English</span>
                  <Badge variant="outline" className="text-xs">혼합 텍스트</Badge>
                </div>
              </SelectItem>
              <SelectItem value="eng">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>화질 최적화</Label>
            <div className="flex items-center space-x-2 pt-2">
              <input
                id="enhance"
                type="checkbox"
                checked={enhance}
                onChange={(e) => setEnhance(e.target.checked)}
                disabled={isProcessing}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
              />
              <Label htmlFor="enhance" className="text-sm font-normal">
                모바일 캡처 최적화
                <Badge variant="secondary" className="ml-1 text-xs">권장</Badge>
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              다크모드, 작은 글자 등 캡처 화질 개선
            </p>
          </div>
        </div>

        {/* Progress */}
        {isProcessing && progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{progress.status}</span>
              <span>{Math.round(progress.progress * 100)}%</span>
            </div>
            <Progress value={progress.progress * 100} />
            <p className="text-xs text-muted-foreground">모바일 캡처 최적화 적용 중</p>
          </div>
        )}

        {/* OCR Button */}
        <Button 
          onClick={processOCR} 
          disabled={!file || isProcessing}
          className="w-full"
        >
          {isProcessing ? '최적화 + OCR 중...' : 'OCR 실행'}
        </Button>

        {/* Extracted Text Display */}
        {extractedText && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">추출된 텍스트</Label>
                <Badge variant="outline" className="text-xs">
                  {extractedText.length} 문자
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                추가할 텍스트를 마우스로 드래그하여 선택한 후 버튼을 클릭하세요
              </p>
              <Textarea
                ref={textareaRef}
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder="OCR로 추출된 텍스트가 여기에 표시됩니다..."
              />
              
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => addToField('question')}
                  className="w-full"
                >
                  문제에 추가
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => addToField('wrongAnswer')}
                  className="w-full"
                >
                  오답에 추가
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => addToField('correctAnswer')}
                  className="w-full"
                >
                  정답에 추가
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}