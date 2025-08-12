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

      // OCR 정확도를 높이기 위한 설정 (문서/책 텍스트에 최적화)
      await worker.setParameters({
        tessedit_char_whitelist: '',
        preserve_interword_spaces: '1',
      });

      // 더 자세한 정보를 얻기 위해 TSV 출력도 요청
      const ret = await worker.recognize(imageDataUrl, {
        rectangle: undefined,
      });

      console.log('OCR Result:', ret);
      
      // OCR 결과에서 텍스트 정보 추출
      const fullText = ret.data.text || '';
      console.log('Full OCR Text:', fullText);
      
      const blocks: TextBlock[] = [];
      
      // Tesseract.js 결과에서 정보 추출 (개선된 방법)
      try {
        const data = ret.data as any;
        
        // 먼저 symbols부터 시작해서 더 세밀한 단위로 추출 시도
        if (data.symbols && Array.isArray(data.symbols) && data.symbols.length > 0) {
          console.log('Using symbols from OCR result:', data.symbols.length);
          // 심볼들을 단어 단위로 그룹화
          let currentWord = '';
          let currentBbox = null;
          
          data.symbols.forEach((symbol: any) => {
            if (symbol.text && symbol.bbox) {
              if (symbol.text === ' ' || symbol.text === '\n') {
                // 공백이나 줄바꿈이면 현재 단어 저장
                if (currentWord.trim() && currentBbox) {
                  blocks.push({
                    text: currentWord.trim(),
                    bbox: currentBbox
                  });
                }
                currentWord = '';
                currentBbox = null;
              } else {
                // 문자 추가
                currentWord += symbol.text;
                if (!currentBbox) {
                  currentBbox = { ...symbol.bbox };
                } else {
                  // bbox 확장
                  currentBbox.x1 = symbol.bbox.x1;
                  currentBbox.y1 = Math.max(currentBbox.y1, symbol.bbox.y1);
                }
              }
            }
          });
          
          // 마지막 단어 저장
          if (currentWord.trim() && currentBbox) {
            blocks.push({
              text: currentWord.trim(),
              bbox: currentBbox
            });
          }
        }
        // words가 있는지 확인
        else if (data.words && Array.isArray(data.words) && data.words.length > 0) {
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
            } else if (line.text && line.text.trim() && line.bbox) {
              // 라인 레벨에서 텍스트 분할
              const words = line.text.trim().split(/\s+/);
              const lineWidth = line.bbox.x1 - line.bbox.x0;
              const wordWidth = lineWidth / words.length;
              
              words.forEach((word: string, index: number) => {
                if (word.trim()) {
                  blocks.push({
                    text: word.trim(),
                    bbox: {
                      x0: line.bbox.x0 + (index * wordWidth),
                      y0: line.bbox.y0,
                      x1: line.bbox.x0 + ((index + 1) * wordWidth),
                      y1: line.bbox.y1
                    }
                  });
                }
              });
            }
          });
        } 
        // paragraphs에서 추출
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
                } else if (line.text && line.text.trim() && line.bbox) {
                  // 라인을 단어로 분할
                  const words = line.text.trim().split(/\s+/);
                  const lineWidth = line.bbox.x1 - line.bbox.x0;
                  const wordWidth = lineWidth / words.length;
                  
                  words.forEach((word: string, index: number) => {
                    if (word.trim()) {
                      blocks.push({
                        text: word.trim(),
                        bbox: {
                          x0: line.bbox.x0 + (index * wordWidth),
                          y0: line.bbox.y0,
                          x1: line.bbox.x0 + ((index + 1) * wordWidth),
                          y1: line.bbox.y1
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
        
        // 마지막 대안: 전체 텍스트를 줄 단위로 분할하고 실제 이미지 크기 고려
        if (blocks.length === 0 && fullText.trim()) {
          console.log('No structured data found, using improved fallback method');
          
          // 이미지 크기 정보 가져오기
          let imageWidth = 800; // 기본값
          let imageHeight = 600; // 기본값
          
          if (imageRef.current) {
            imageWidth = imageRef.current.naturalWidth;
            imageHeight = imageRef.current.naturalHeight;
          }
          
          const lines = fullText.split(/\n+/).filter(line => line.trim().length > 0);
          const lineHeight = Math.max(30, imageHeight / Math.max(lines.length * 2, 10));
          const startY = Math.max(50, imageHeight * 0.1);
          
          lines.forEach((line, index) => {
            if (line.trim()) {
              const words = line.trim().split(/\s+/);
              const lineY = startY + (index * lineHeight);
              const wordWidth = Math.max(imageWidth * 0.8 / words.length, 50);
              const startX = imageWidth * 0.1;
              
              words.forEach((word, wordIndex) => {
                if (word.trim()) {
                  blocks.push({
                    text: word.trim(),
                    bbox: {
                      x0: startX + (wordIndex * wordWidth),
                      y0: lineY,
                      x1: startX + ((wordIndex + 1) * wordWidth),
                      y1: lineY + lineHeight * 0.8
                    }
                  });
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('Error processing OCR blocks:', error);
        
        // 최종 대체 방법
        if (fullText.trim()) {
          console.log('Using emergency fallback method');
          const lines = fullText.split(/\n+/).filter(line => line.trim().length > 0);
          const lineHeight = 40;
          const startY = 50;
          
          lines.forEach((line, index) => {
            if (line.trim()) {
              const words = line.trim().split(/\s+/);
              const wordWidth = 100;
              const startX = 10;
              
              words.forEach((word, wordIndex) => {
                if (word.trim()) {
                  blocks.push({
                    text: word.trim(),
                    bbox: {
                      x0: startX + (wordIndex * wordWidth),
                      y0: startY + (index * lineHeight),
                      x1: startX + ((wordIndex + 1) * wordWidth),
                      y1: startY + (index * lineHeight) + 30
                    }
                  });
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

  // 정확한 이미지 좌표 계산을 위한 헬퍼 함수
  const getImageCoordinates = useCallback(() => {
    if (!imageRef.current) return null;
    
    const img = imageRef.current;
    const rect = img.getBoundingClientRect();
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;
    
    // object-fit: contain 방식으로 실제 이미지가 표시되는 영역 계산
    const scaleX = displayWidth / naturalWidth;
    const scaleY = displayHeight / naturalHeight;
    const scale = Math.min(scaleX, scaleY);
    
    const actualImageWidth = naturalWidth * scale;
    const actualImageHeight = naturalHeight * scale;
    const offsetX = (displayWidth - actualImageWidth) / 2;
    const offsetY = (displayHeight - actualImageHeight) / 2;
    
    return {
      naturalWidth,
      naturalHeight,
      displayWidth,
      displayHeight,
      scale,
      actualImageWidth,
      actualImageHeight,
      offsetX,
      offsetY,
      rect
    };
  }, []);

  // 선택 영역 내의 텍스트 찾기 (정확한 좌표 변환)
  const getTextsInSelection = useCallback((selection: SelectionBox) => {
    if (!selection || textBlocks.length === 0) {
      console.log('No selection or text blocks');
      return [];
    }
    
    const imageCoords = getImageCoordinates();
    if (!imageCoords) {
      console.log('Could not get image coordinates');
      return [];
    }
    
    const { scale, offsetX, offsetY, actualImageWidth, actualImageHeight } = imageCoords;
    
    console.log('Detailed image positioning:', {
      scale, offsetX, offsetY,
      actualImageWidth, actualImageHeight,
      selectionBox: selection
    });
    
    // 브라우저 좌표를 이미지 좌표계로 정확히 변환
    const minX = Math.min(selection.startX, selection.endX);
    const maxX = Math.max(selection.startX, selection.endX);
    const minY = Math.min(selection.startY, selection.endY);
    const maxY = Math.max(selection.startY, selection.endY);
    
    // 선택 영역이 실제 이미지 영역 내에 있는지 확인하고 클램핑
    const clampedMinX = Math.max(0, minX - offsetX);
    const clampedMaxX = Math.min(actualImageWidth, maxX - offsetX);
    const clampedMinY = Math.max(0, minY - offsetY);
    const clampedMaxY = Math.min(actualImageHeight, maxY - offsetY);
    
    // 오프셋을 제거하고 스케일로 나누어 원본 이미지 좌표로 변환
    const adjustedMinX = clampedMinX / scale;
    const adjustedMaxX = clampedMaxX / scale;
    const adjustedMinY = clampedMinY / scale;
    const adjustedMaxY = clampedMaxY / scale;
    
    console.log('Coordinate conversion:', {
      browser: { minX, maxX, minY, maxY },
      adjusted: { 
        minX: adjustedMinX, maxX: adjustedMaxX, 
        minY: adjustedMinY, maxY: adjustedMaxY 
      }
    });
    
    // 구조화된 문서를 위한 더 관대한 여유 공간
    const margin = 8; // 문서 텍스트의 행간과 들여쓰기를 고려한 여유
    
    // 선택 영역과 겹치는 텍스트 블록 찾기
    const foundTexts = textBlocks
      .filter(block => {
        // 블록의 경계 상자가 선택 영역과 겹치는지 확인
        const blockLeft = block.bbox.x0;
        const blockRight = block.bbox.x1;
        const blockTop = block.bbox.y0;
        const blockBottom = block.bbox.y1;
        
        // 블록과 선택 영역이 겹치는지 확인 (AABB 충돌 검사)
        const horizontalOverlap = blockRight >= (adjustedMinX - margin) && 
                                 blockLeft <= (adjustedMaxX + margin);
        const verticalOverlap = blockBottom >= (adjustedMinY - margin) && 
                               blockTop <= (adjustedMaxY + margin);
        const overlaps = horizontalOverlap && verticalOverlap;
        
        // 블록의 중심점이 선택 영역 내에 있는지도 확인
        const centerX = (blockLeft + blockRight) / 2;
        const centerY = (blockTop + blockBottom) / 2;
        const centerInside = centerX >= (adjustedMinX - margin) && 
                            centerX <= (adjustedMaxX + margin) && 
                            centerY >= (adjustedMinY - margin) && 
                            centerY <= (adjustedMaxY + margin);
        
        // 블록의 일부분이라도 선택 영역과 겹치는지 확인 (더 관대한 방식)
        const partialOverlap = !(
          blockRight < (adjustedMinX - margin) ||
          blockLeft > (adjustedMaxX + margin) ||
          blockBottom < (adjustedMinY - margin) ||
          blockTop > (adjustedMaxY + margin)
        );
        
        const isSelected = overlaps || centerInside || partialOverlap;
        
        if (isSelected) {
          console.log(`✓ Selected: "${block.text}"`, {
            bbox: block.bbox,
            center: { x: centerX, y: centerY },
            overlaps,
            centerInside,
            partialOverlap
          });
        }
        
        return isSelected;
      })
      .map(block => block.text.trim())
      .filter(text => text.length > 0);
      
    console.log('Found texts in selection:', foundTexts);
    return foundTexts;
  }, [textBlocks, getImageCoordinates]);

  // 정확한 마우스 좌표 계산을 위한 드래그 이벤트 핸들러들
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imageRef.current) return;
    
    // 이미지 요소 기준으로 정확한 좌표 계산
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
                  // 이미지 로드 후 좌표 계산 준비
                  console.log('Image loaded, ready for coordinate calculations');
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