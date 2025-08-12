import { useState, useRef } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { createWorker } from 'tesseract.js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera as CameraIcon, Image, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OCRCameraProps {
  onTextExtracted: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface TextBlock {
  text: string;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export const OCRCamera = ({ onTextExtracted, isOpen, onClose }: OCRCameraProps) => {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [selectedTexts, setSelectedTexts] = useState<string[]>([]);
  const [imageScale, setImageScale] = useState(1);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const takePicture = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      setPhoto(image);
      setTextBlocks([]);
      setSelectedTexts([]);
    } catch (error) {
      console.error('Error taking picture:', error);
      toast({
        title: "오류",
        description: "사진 촬영에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const pickFromGallery = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      setPhoto(image);
      setTextBlocks([]);
      setSelectedTexts([]);
    } catch (error) {
      console.error('Error picking from gallery:', error);
      toast({
        title: "오류",
        description: "갤러리에서 이미지 선택에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const processOCR = async () => {
    if (!photo?.dataUrl) return;

    setIsProcessing(true);
    try {
      const worker = await createWorker('kor+eng', 1, {
        logger: m => console.log(m)
      });

      const ret = await worker.recognize(photo.dataUrl);

      // 전체 텍스트를 문장 단위로 분할
      const fullText = ret.data.text || '';
      const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      // 간단한 텍스트 블록 생성 (실제 위치는 추정)
      const blocks: TextBlock[] = sentences.map((sentence, index) => ({
        text: sentence.trim(),
        bbox: {
          x0: 10,
          y0: 50 + (index * 30),
          x1: 400,
          y1: 70 + (index * 30)
        }
      }));

      setTextBlocks(blocks);
      
      // 이미지 스케일 계산
      if (imageRef.current) {
        const naturalWidth = imageRef.current.naturalWidth;
        const displayWidth = imageRef.current.clientWidth;
        setImageScale(displayWidth / naturalWidth);
      }

      await worker.terminate();
      
      toast({
        title: "OCR 완료",
        description: "텍스트 인식이 완료되었습니다. 원하는 텍스트를 선택하세요.",
      });
    } catch (error) {
      console.error('Error processing OCR:', error);
      toast({
        title: "오류",
        description: "텍스트 인식에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextClick = (textBlock: TextBlock) => {
    const text = textBlock.text.trim();
    if (!text) return;

    setSelectedTexts(prev => {
      if (prev.includes(text)) {
        return prev.filter(t => t !== text);
      } else {
        return [...prev, text];
      }
    });
  };

  const handleConfirmSelection = () => {
    if (selectedTexts.length === 0) {
      toast({
        title: "알림",
        description: "선택된 텍스트가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const combinedText = selectedTexts.join(' ');
    onTextExtracted(combinedText);
    onClose();
    resetState();
  };

  const resetState = () => {
    setPhoto(null);
    setTextBlocks([]);
    setSelectedTexts([]);
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>OCR 텍스트 추출</DialogTitle>
        </DialogHeader>

        {!photo ? (
          <div className="space-y-4">
            <div className="text-center text-muted-foreground mb-6">
              사진을 촬영하거나 갤러리에서 선택하세요
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={takePicture} className="h-20 flex-col gap-2">
                <CameraIcon className="h-8 w-8" />
                사진 촬영
              </Button>
              <Button onClick={pickFromGallery} variant="outline" className="h-20 flex-col gap-2">
                <Image className="h-8 w-8" />
                갤러리 선택
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img
                ref={imageRef}
                src={photo.dataUrl}
                alt="Selected"
                className="max-w-full h-auto rounded-lg border"
                onLoad={() => {
                  if (imageRef.current) {
                    const naturalWidth = imageRef.current.naturalWidth;
                    const displayWidth = imageRef.current.clientWidth;
                    setImageScale(displayWidth / naturalWidth);
                  }
                }}
              />
              
              {/* 텍스트 블록 오버레이 */}
              {textBlocks.length > 0 && (
                <div className="absolute inset-0">
                  {textBlocks.map((block, index) => {
                    const isSelected = selectedTexts.includes(block.text.trim());
                    return (
                      <div
                        key={index}
                        className={`absolute cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-blue-500/30 border-2 border-blue-500' 
                            : 'bg-yellow-300/20 border border-yellow-500 hover:bg-yellow-300/40'
                        }`}
                        style={{
                          left: block.bbox.x0 * imageScale,
                          top: block.bbox.y0 * imageScale,
                          width: (block.bbox.x1 - block.bbox.x0) * imageScale,
                          height: (block.bbox.y1 - block.bbox.y0) * imageScale,
                        }}
                        onClick={() => handleTextClick(block)}
                        title={block.text}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {textBlocks.length === 0 ? (
              <div className="flex gap-2">
                <Button onClick={processOCR} disabled={isProcessing} className="flex-1">
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      텍스트 인식 중...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      텍스트 인식 시작
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setPhoto(null)}>
                  다시 선택
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedTexts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">선택된 텍스트</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm bg-muted p-3 rounded border">
                        {selectedTexts.join(' ')}
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleConfirmSelection} 
                    disabled={selectedTexts.length === 0}
                    className="flex-1"
                  >
                    선택 완료
                  </Button>
                  <Button variant="outline" onClick={processOCR}>
                    다시 인식
                  </Button>
                  <Button variant="outline" onClick={() => setPhoto(null)}>
                    다시 선택
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};