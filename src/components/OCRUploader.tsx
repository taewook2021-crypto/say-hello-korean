import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileText, Loader2 } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface OCRUploaderProps {
  onTextExtracted: (text: string) => void;
}

export const OCRUploader = ({ onTextExtracted }: OCRUploaderProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState<string>('');
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
      toast({
        title: "오류",
        description: "이미지 파일만 업로드 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setExtractedText('');

    try {
      const result = await Tesseract.recognize(
        file,
        'kor+eng', // 한국어와 영어 인식
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          },
        }
      );

      const text = result.data.text.trim();
      if (text) {
        setExtractedText(text);
        onTextExtracted(text);
        toast({
          title: "성공",
          description: "텍스트 추출이 완료되었습니다.",
        });
      } else {
        toast({
          title: "경고",
          description: "인식된 텍스트가 없습니다. 더 선명한 이미지를 시도해보세요.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('OCR Error:', error);
      toast({
        title: "오류",
        description: "텍스트 추출 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-medium">이미지에서 텍스트 추출</span>
            </div>
            
            <div className="w-full">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
                id="ocr-upload"
              />
              <label htmlFor="ocr-upload">
                <Button
                  variant="outline"
                  className="w-full cursor-pointer"
                  disabled={isProcessing}
                  asChild
                >
                  <div className="flex items-center gap-2">
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {isProcessing ? '처리 중...' : '이미지 업로드'}
                  </div>
                </Button>
              </label>
            </div>

            {isProcessing && (
              <div className="w-full space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  텍스트 인식 중... {progress}%
                </p>
              </div>
            )}

            {extractedText && (
              <div className="w-full">
                <h4 className="text-sm font-medium mb-2">추출된 텍스트:</h4>
                <div className="bg-muted p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                  {extractedText}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};