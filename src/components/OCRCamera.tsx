import { useState, useRef, useCallback } from 'react';
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

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
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
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [currentSelection, setCurrentSelection] = useState<SelectionBox | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

      // OCR 결과에서 단어/줄 정보 추출
      const fullText = ret.data.text || '';
      const blocks: TextBlock[] = [];
      
      // Tesseract.js 결과에서 실제 bounding box 정보 추출 시도
      try {
        const symbols = (ret.data as any).symbols || [];
        symbols.forEach((symbol: any) => {
          if (symbol.text && symbol.text.trim() && symbol.bbox) {
            blocks.push({
              text: symbol.text,
              bbox: symbol.bbox
            });
          }
        });
      } catch (error) {
        // 만약 symbols가 없다면 전체 텍스트를 단순 분할
        const sentences = fullText.split(/[.!?\n]+/).filter(s => s.trim().length > 0);
        sentences.forEach((sentence, index) => {
          blocks.push({
            text: sentence.trim(),
            bbox: {
              x0: 10,
              y0: 50 + (index * 30),
              x1: 400,
              y1: 70 + (index * 30)
            }
          });
        });
      }

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

  // 드래그 이벤트 핸들러들
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !imageRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsSelecting(true);
    setCurrentSelection({
      startX: x,
      startY: y,
      endX: x,
      endY: y
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !containerRef.current || !currentSelection) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentSelection(prev => prev ? {
      ...prev,
      endX: x,
      endY: y
    } : null);
  }, [isSelecting, currentSelection]);

  const handleMouseUp = useCallback(() => {
    if (!currentSelection || !isSelecting) return;
    
    setIsSelecting(false);
    setSelectionBox(currentSelection);
    
    // 선택된 영역 내의 텍스트 찾기
    const selectedTextsInArea = getTextsInSelection(currentSelection);
    setSelectedTexts(selectedTextsInArea);
    
  }, [currentSelection, isSelecting]);

  // 선택 영역 내의 텍스트 찾기
  const getTextsInSelection = (selection: SelectionBox) => {
    if (!selection || textBlocks.length === 0) return [];
    
    const minX = Math.min(selection.startX, selection.endX) / imageScale;
    const maxX = Math.max(selection.startX, selection.endX) / imageScale;
    const minY = Math.min(selection.startY, selection.endY) / imageScale;
    const maxY = Math.max(selection.startY, selection.endY) / imageScale;
    
    return textBlocks
      .filter(block => {
        // 텍스트 블록이 선택 영역과 겹치는지 확인
        return !(
          block.bbox.x1 < minX ||
          block.bbox.x0 > maxX ||
          block.bbox.y1 < minY ||
          block.bbox.y0 > maxY
        );
      })
      .map(block => block.text.trim())
      .filter(text => text.length > 0);
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
    setSelectionBox(null);
    setCurrentSelection(null);
    setIsSelecting(false);
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
            <div 
              ref={containerRef}
              className="relative cursor-crosshair select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <img
                ref={imageRef}
                src={photo.dataUrl}
                alt="Selected"
                className="max-w-full h-auto rounded-lg border"
                draggable={false}
                onLoad={() => {
                  if (imageRef.current) {
                    const naturalWidth = imageRef.current.naturalWidth;
                    const displayWidth = imageRef.current.clientWidth;
                    setImageScale(displayWidth / naturalWidth);
                  }
                }}
              />
              
              {/* 현재 드래그 중인 선택 영역 */}
              {isSelecting && currentSelection && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
                  style={{
                    left: Math.min(currentSelection.startX, currentSelection.endX),
                    top: Math.min(currentSelection.startY, currentSelection.endY),
                    width: Math.abs(currentSelection.endX - currentSelection.startX),
                    height: Math.abs(currentSelection.endY - currentSelection.startY),
                  }}
                />
              )}
              
              {/* 확정된 선택 영역 */}
              {!isSelecting && selectionBox && (
                <div
                  className="absolute border-2 border-green-500 bg-green-500/20 pointer-events-none"
                  style={{
                    left: Math.min(selectionBox.startX, selectionBox.endX),
                    top: Math.min(selectionBox.startY, selectionBox.endY),
                    width: Math.abs(selectionBox.endX - selectionBox.startX),
                    height: Math.abs(selectionBox.endY - selectionBox.startY),
                  }}
                />
              )}
              
              {/* 텍스트 블록 오버레이 (클릭용) */}
              {textBlocks.length > 0 && !isSelecting && (
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

            <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
              💡 <strong>사용법:</strong> 마우스로 드래그하여 텍스트 영역을 선택하거나, 개별 텍스트를 클릭하세요
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
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectionBox(null);
                      setSelectedTexts([]);
                    }}
                  >
                    선택 초기화
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