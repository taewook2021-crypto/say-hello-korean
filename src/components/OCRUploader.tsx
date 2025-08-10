import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileText, Loader2, Settings } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Tesseract from 'tesseract.js';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker for Vite/ESM
GlobalWorkerOptions.workerSrc = pdfjsWorker as unknown as string;

interface OCRUploaderProps {
  onTextExtracted: (text: string) => void;
}

export const OCRUploader = ({ onTextExtracted }: OCRUploaderProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ocrOptions, setOcrOptions] = useState({
    preprocessImage: true,
    koreanOnly: false,
    mathMode: false
  });
  const { toast } = useToast();

  // 이미지 전처리 함수
  const preprocessImage = (canvas: HTMLCanvasElement): Promise<string> => {
    return new Promise((resolve) => {
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 대비 개선 및 노이즈 제거
      for (let i = 0; i < data.length; i += 4) {
        // 그레이스케일 변환
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        
        // 대비 개선 (0.7보다 작으면 검정, 큰 것은 흰색으로)
        const enhanced = gray > 127 ? 255 : 0;
        
        data[i] = enhanced;     // R
        data[i + 1] = enhanced; // G
        data[i + 2] = enhanced; // B
        // A는 그대로 유지
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 지원 형식 확인 (이미지 또는 PDF)
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!(isImage || isPdf)) {
      toast({
        title: "오류",
        description: "이미지 또는 PDF 파일만 업로드 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setExtractedText('');

    try {
      // 언어 설정
      const language = ocrOptions.koreanOnly ? 'kor' : 'kor+eng';

      // Tesseract 옵션 생성기 (PDF 진행률 반영 가능)
      const buildTesseractOptions = (pageIndex?: number, totalPages?: number) => {
        const opts: any = {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              const inner = Math.max(0, Math.min(1, m.progress || 0));
              if (pageIndex && totalPages) {
                setProgress(Math.round(((pageIndex - 1) + inner) / totalPages * 100));
              } else {
                setProgress(Math.round(inner * 100));
              }
            }
          },
        };
        if (ocrOptions.mathMode) {
          opts.tessedit_pageseg_mode = Tesseract.PSM.SINGLE_BLOCK;
          opts.tessedit_char_whitelist = '0123456789+-×÷=()[]{}.,ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz가-힣';
        } else {
          opts.tessedit_pageseg_mode = Tesseract.PSM.AUTO;
        }
        return opts;
      };

      // PDF 처리
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        const ab = await file.arrayBuffer();
        const pdf = await getDocument({ data: ab }).promise;

        let combinedText = '';
        const confidences: number[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx as any, viewport, canvas }).promise;

          let source: string | HTMLCanvasElement = canvas;
          if (ocrOptions.preprocessImage) {
            source = await preprocessImage(canvas);
          }

          const result = await Tesseract.recognize(
            source as any,
            language,
            buildTesseractOptions(pageNum, pdf.numPages)
          );

          const pageText = result.data.text.trim();
          if (pageText) {
            combinedText += (combinedText ? '\n\n' : '') + pageText;
          }
          if (typeof result.data.confidence === 'number') {
            confidences.push(result.data.confidence);
          }
        }

        const avgConf = confidences.length
          ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
          : undefined;
        const finalText = combinedText.trim();

        if (finalText) {
          setExtractedText(finalText);
          onTextExtracted(finalText);
          toast({
            title: '성공',
            description: `PDF에서 텍스트 추출이 완료되었습니다.${avgConf ? ` (신뢰도: ${avgConf}%)` : ''}`,
          });
        } else {
          toast({
            title: '경고',
            description: '인식된 텍스트가 없습니다. 더 선명한 PDF를 시도해보세요.',
            variant: 'destructive',
          });
        }
      } else {
        // 이미지 처리
        let imageToProcess: string | File = file;
        if (ocrOptions.preprocessImage) {
          const img = new Image();
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.src = URL.createObjectURL(file);
          });
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          imageToProcess = await preprocessImage(canvas);
          URL.revokeObjectURL(img.src);
        }

        const result = await Tesseract.recognize(
          imageToProcess as any,
          language,
          buildTesseractOptions()
        );

        const text = result.data.text.trim();
        if (text) {
          setExtractedText(text);
          onTextExtracted(text);
          toast({
            title: '성공',
            description: `텍스트 추출이 완료되었습니다. (신뢰도: ${Math.round(result.data.confidence)}%)`,
          });
        } else {
          toast({
            title: '경고',
            description: '인식된 텍스트가 없습니다. 더 선명한 이미지를 시도해보세요.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('OCR Error:', error);
      toast({
        title: '오류',
        description: '텍스트 추출 중 오류가 발생했습니다.',
        variant: 'destructive',
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
            <span className="font-medium">이미지/PDF에서 텍스트 추출</span>
          </div>
            
            <div className="w-full">
              <Input
                type="file"
                accept="image/*,.pdf"
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
                    {isProcessing ? '처리 중...' : '파일 업로드'}
                  </div>
                </Button>
              </label>
            </div>

            {/* 고급 설정 */}
            <div className="w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                고급 설정 {showAdvanced ? '숨기기' : '보기'}
              </Button>

              {showAdvanced && (
                <div className="mt-3 space-y-3 p-3 border rounded-md bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preprocess"
                      checked={ocrOptions.preprocessImage}
                      onCheckedChange={(checked) => 
                        setOcrOptions(prev => ({ ...prev, preprocessImage: checked as boolean }))
                      }
                    />
                    <Label htmlFor="preprocess" className="text-sm">
                      이미지 전처리 (대비 개선, 노이즈 제거)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="korean-only"
                      checked={ocrOptions.koreanOnly}
                      onCheckedChange={(checked) => 
                        setOcrOptions(prev => ({ ...prev, koreanOnly: checked as boolean }))
                      }
                    />
                    <Label htmlFor="korean-only" className="text-sm">
                      한국어만 인식 (한글 문제에 최적화)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="math-mode"
                      checked={ocrOptions.mathMode}
                      onCheckedChange={(checked) => 
                        setOcrOptions(prev => ({ ...prev, mathMode: checked as boolean }))
                      }
                    />
                    <Label htmlFor="math-mode" className="text-sm">
                      수학 문제 모드 (수식 인식 개선)
                    </Label>
                  </div>
                </div>
              )}
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