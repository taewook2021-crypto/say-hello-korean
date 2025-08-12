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
      // 사진 선택 후 자동으로 OCR 실행
      setTimeout(() => {
        processOCRForImage(image);
      }, 500);
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
      // 갤러리 선택 후 자동으로 OCR 실행
      setTimeout(() => {
        processOCRForImage(image);
      }, 500);
    } catch (error) {
      console.error('Error picking from gallery:', error);
      toast({
        title: "오류",
        description: "갤러리에서 이미지 선택에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const processOCRForImage = async (imageToProcess: Photo) => {
    if (!imageToProcess?.dataUrl) return;

    setIsProcessing(true);
    try {
      await processOCR(imageToProcess);
    } finally {
      setIsProcessing(false);
    }
  };

  const processOCR = async (imageToProcess?: Photo) => {
    const imageDataUrl = imageToProcess?.dataUrl || photo?.dataUrl;
    if (!imageDataUrl) return;

    setIsProcessing(true);
    try {
      const worker = await createWorker('kor+eng', 1, {
        logger: m => console.log(m)
      });

      const ret = await worker.recognize(imageDataUrl);
      console.log('OCR Result:', ret);
      
      // OCR 결과에서 텍스트 정보 추출
      const fullText = ret.data.text || '';
      console.log('Full OCR Text:', fullText);
      
      const blocks: TextBlock[] = [];
      
      // Tesseract.js 결과에서 정보 추출 (타입 안전하게)
      try {
        // ret.data를 any로 캐스팅해서 안전하게 접근
        const data = ret.data as any;
        
        // words가 있는지 확인
        if (data.words && Array.isArray(data.words) && data.words.length > 0) {
          console.log('Using words from OCR result:', data.words.length);
          data.words.forEach((word: any) => {
            if (word.text && word.text.trim() && word.bbox) {
              blocks.push({
                text: word.text.trim(),
                bbox: word.bbox
              });
            }
          });
        } 
        // lines가 있는지 확인
        else if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
          console.log('Using lines from OCR result:', data.lines.length);
          data.lines.forEach((line: any) => {
            if (line.words && Array.isArray(line.words) && line.words.length > 0) {
              line.words.forEach((word: any) => {
                if (word.text && word.text.trim() && word.bbox) {
                  blocks.push({
                    text: word.text.trim(),
                    bbox: word.bbox
                  });
                }
              });
            }
          });
        } 
        // paragraphs에서 words 추출 시도
        else if (data.paragraphs && Array.isArray(data.paragraphs)) {
          console.log('Using paragraphs from OCR result');
          data.paragraphs.forEach((paragraph: any) => {
            if (paragraph.lines && Array.isArray(paragraph.lines)) {
              paragraph.lines.forEach((line: any) => {
                if (line.words && Array.isArray(line.words)) {
                  line.words.forEach((word: any) => {
                    if (word.text && word.text.trim() && word.bbox) {
                      blocks.push({
                        text: word.text.trim(),
                        bbox: word.bbox
                      });
                    }
                  });
                }
              });
            }
          });
        }
        
        // 아무것도 없으면 전체 텍스트를 단순 분할
        if (blocks.length === 0 && fullText.trim()) {
          console.log('No structured data found, using fallback method');
          const sentences = fullText.split(/[\.\!\?\n]+/).filter(s => s.trim().length > 0);
          sentences.forEach((sentence, index) => {
            if (sentence.trim()) {
              blocks.push({
                text: sentence.trim(),
                bbox: {
                  x0: 10,
                  y0: 50 + (index * 40),
                  x1: 400,
                  y1: 80 + (index * 40)
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('Error processing OCR blocks:', error);
        
        // 완전한 대체 방법
        if (fullText.trim()) {
          console.log('Using emergency fallback method');
          const sentences = fullText.split(/[\.\!\?\n]+/).filter(s => s.trim().length > 0);
          sentences.forEach((sentence, index) => {
            if (sentence.trim()) {
              blocks.push({
                text: sentence.trim(),
                bbox: {
                  x0: 10,
                  y0: 50 + (index * 40),
                  x1: 400,
                  y1: 80 + (index * 40)
                }
              });
            }
          });
        }
      }
      
      console.log('Final text blocks:', blocks);

      setTextBlocks(blocks);
      
      // 이미지 스케일 계산 (더 정확하게)
      if (imageRef.current) {
        const naturalWidth = imageRef.current.naturalWidth;
        const naturalHeight = imageRef.current.naturalHeight;
        const displayWidth = imageRef.current.clientWidth;
        const displayHeight = imageRef.current.clientHeight;
        
        // 실제 표시되는 이미지의 크기를 고려한 스케일 계산
        const scaleX = displayWidth / naturalWidth;
        const scaleY = displayHeight / naturalHeight;
        const scale = Math.min(scaleX, scaleY); // object-fit: contain과 같은 방식
        
        setImageScale(scale);
        console.log('Image scale calculation:', {
          naturalWidth, naturalHeight,
          displayWidth, displayHeight,
          scaleX, scaleY, finalScale: scale
        });
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

  // 선택 영역 내의 텍스트 찾기 (개선된 좌표 변환)
  const getTextsInSelection = useCallback((selection: SelectionBox) => {
    if (!selection || textBlocks.length === 0 || !imageRef.current) {
      console.log('No selection, text blocks, or image ref');
      return [];
    }
    
    // 이미지의 실제 표시 영역 계산 (object-fit: contain 고려)
    const img = imageRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;
    
    // 실제 이미지가 표시되는 영역의 크기와 위치 계산
    const scaleX = displayWidth / naturalWidth;
    const scaleY = displayHeight / naturalHeight;
    const scale = Math.min(scaleX, scaleY);
    
    const actualImageWidth = naturalWidth * scale;
    const actualImageHeight = naturalHeight * scale;
    const offsetX = (displayWidth - actualImageWidth) / 2;
    const offsetY = (displayHeight - actualImageHeight) / 2;
    
    console.log('Image positioning:', {
      naturalWidth, naturalHeight,
      displayWidth, displayHeight,
      scale, actualImageWidth, actualImageHeight,
      offsetX, offsetY
    });
    
    // 선택 좌표를 이미지 좌표계로 변환
    const adjustedMinX = (Math.min(selection.startX, selection.endX) - offsetX) / scale;
    const adjustedMaxX = (Math.max(selection.startX, selection.endX) - offsetX) / scale;
    const adjustedMinY = (Math.min(selection.startY, selection.endY) - offsetY) / scale;
    const adjustedMaxY = (Math.max(selection.startY, selection.endY) - offsetY) / scale;
    
    console.log('Original selection:', {
      startX: selection.startX, startY: selection.startY,
      endX: selection.endX, endY: selection.endY
    });
    console.log('Adjusted selection in image coordinates:', {
      minX: adjustedMinX, maxX: adjustedMaxX,
      minY: adjustedMinY, maxY: adjustedMaxY
    });
    
    // 더 정확한 겹침 검사를 위한 여유 공간
    const margin = 3; // 픽셀 단위 여유
    
    const foundTexts = textBlocks
      .filter(block => {
        // 텍스트 블록의 중심점이 선택 영역 안에 있는지 확인
        const blockCenterX = (block.bbox.x0 + block.bbox.x1) / 2;
        const blockCenterY = (block.bbox.y0 + block.bbox.y1) / 2;
        
        const centerInSelection = 
          blockCenterX >= adjustedMinX - margin &&
          blockCenterX <= adjustedMaxX + margin &&
          blockCenterY >= adjustedMinY - margin &&
          blockCenterY <= adjustedMaxY + margin;
        
        // 또는 블록과 선택 영역이 겹치는지 확인 (더 관대한 방식)
        const overlaps = !(
          block.bbox.x1 < adjustedMinX - margin ||
          block.bbox.x0 > adjustedMaxX + margin ||
          block.bbox.y1 < adjustedMinY - margin ||
          block.bbox.y0 > adjustedMaxY + margin
        );
        
        const isSelected = centerInSelection || overlaps;
        
        if (isSelected) {
          console.log(`✓ Block "${block.text}" selected:`, {
            bbox: block.bbox,
            center: { x: blockCenterX, y: blockCenterY },
            centerInSelection,
            overlaps
          });
        }
        
        return isSelected;
      })
      .map(block => block.text.trim())
      .filter(text => text.length > 0);
      
    console.log('Found texts in selection:', foundTexts);
    return foundTexts;
  }, [textBlocks]);

  // 드래그 이벤트 핸들러들 (개선된 좌표 계산)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !imageRef.current) return;
    
    // 컨테이너 기준 좌표가 아닌 이미지 기준 좌표 계산
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('Mouse down at image coordinates:', { x, y });
    
    setIsSelecting(true);
    setCurrentSelection({
      startX: x,
      startY: y,
      endX: x,
      endY: y
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentSelection(prev => prev ? {
      ...prev,
      endX: x,
      endY: y
    } : null);
  }, [isSelecting]);

  const handleMouseUp = useCallback(() => {
    if (!currentSelection || !isSelecting) return;
    
    console.log('Mouse up with selection:', currentSelection);
    console.log('Text blocks available:', textBlocks.length);
    console.log('Image scale:', imageScale);
    
    setIsSelecting(false);
    setSelectionBox(currentSelection);
    
    // 선택된 영역 내의 텍스트 찾기
    const selectedTextsInArea = getTextsInSelection(currentSelection);
    console.log('Texts found in selection area:', selectedTextsInArea);
    setSelectedTexts(selectedTextsInArea);
    
  }, [currentSelection, isSelecting, textBlocks, imageScale, getTextsInSelection]);

  const handleTextClick = (textBlock: TextBlock) => {
    const text = textBlock.text.trim();
    if (!text) return;

    console.log('Text clicked:', text);
    setSelectedTexts(prev => {
      const newSelection = prev.includes(text) 
        ? prev.filter(t => t !== text)
        : [...prev, text];
      console.log('Updated selection:', newSelection);
      return newSelection;
    });
  };

  const handleConfirmSelection = () => {
    console.log('Confirming selection:', selectedTexts);
    if (selectedTexts.length === 0) {
      console.log('No texts selected');
      toast({
        title: "알림",
        description: "선택된 텍스트가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const combinedText = selectedTexts.join(' ');
    console.log('Combined text to extract:', combinedText);
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
            </div>

            <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
              💡 <strong>사용법:</strong> 마우스로 드래그하여 텍스트 영역을 선택하세요
            </div>

            {textBlocks.length === 0 && !isProcessing ? (
              <div className="flex gap-2">
                <Button onClick={() => processOCR()} className="flex-1">
                  <FileText className="mr-2 h-4 w-4" />
                  텍스트 다시 인식
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
                  <Button variant="outline" onClick={() => processOCR()}>
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