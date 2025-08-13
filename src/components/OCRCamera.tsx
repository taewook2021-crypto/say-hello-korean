import { useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import Tesseract from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

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
  id: string;
  text: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const OCRCamera = ({ onTextExtracted, isOpen, onClose }: OCRCameraProps) => {
  const { isPremiumUser } = useProfile();
  const [photo, setPhoto] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedTextBlocks, setExtractedTextBlocks] = useState<TextBlock[]>([]);
  const [selectedTexts, setSelectedTexts] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  const takePicture = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl) {
        setPhoto(image.dataUrl);
        await processOCR(image.dataUrl);
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      toast.error("사진 촬영에 실패했습니다.");
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

      if (image.dataUrl) {
        setPhoto(image.dataUrl);
        await processOCR(image.dataUrl);
      }
    } catch (error) {
      console.error("Error picking from gallery:", error);
      toast.error("갤러리에서 이미지 선택에 실패했습니다.");
    }
  };

  const processOCRForImage = async (imageDataUrl: string) => {
    await processOCR(imageDataUrl);
  };

  const processOCRWithGoogleVision = async (imageDataUrl: string) => {
    console.log("Starting Google Vision OCR...");
    setIsProcessing(true);
    setExtractedTextBlocks([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('google-vision-ocr', {
        body: { imageBase64: imageDataUrl }
      });

      console.log("Google Vision 응답:", data, error);

      if (error) {
        console.error("Supabase function error:", error);
        throw new Error(`Supabase function error: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error("Google Vision failed:", data);
        throw new Error(data?.error || 'Google Vision OCR failed');
      }

      console.log("Google Vision 결과:", data);
      setExtractedTextBlocks(data.textBlocks || []);
      
    } catch (error) {
      console.error("Google Vision OCR 처리 중 오류:", error);
      toast.error(`Google Vision 오류: ${error.message}. Tesseract로 대체합니다.`);
      // Fallback to Tesseract
      await processOCRWithTesseract(imageDataUrl);
    } finally {
      setIsProcessing(false);
    }
  };

  const processOCRWithTesseract = async (imageDataUrl: string) => {
    console.log("시작 Tesseract OCR 처리...");
    setIsProcessing(true);
    setExtractedTextBlocks([]);
    
    try {
      const worker = await Tesseract.createWorker("kor");
      
      // 설정 없이 바로 인식 진행 (기본 설정 사용)
      const { data } = await worker.recognize(imageDataUrl);
      console.log("Tesseract 결과:", data);
      
      // Try to extract text data in order of preference
      let extractedBlocks: TextBlock[] = [];
      
      // First try to get word-level data for better granularity
      if ((data as any).words && (data as any).words.length > 0) {
        console.log("Using words data from Tesseract");
        extractedBlocks = (data as any).words
          .filter((word: any) => word.text && word.text.trim() && word.confidence > 30)
          .map((word: any, index: number) => ({
            id: `word-${index}`,
            text: word.text.trim(),
            boundingBox: {
              x: word.bbox.x0,
              y: word.bbox.y0,
              width: word.bbox.x1 - word.bbox.x0,
              height: word.bbox.y1 - word.bbox.y0
            }
          }));
      }
      // Then try lines if words are not available
      else if ((data as any).lines && (data as any).lines.length > 0) {
        console.log("Using lines data from Tesseract");
        extractedBlocks = (data as any).lines
          .filter((line: any) => line.text && line.text.trim() && line.confidence > 30)
          .map((line: any, index: number) => ({
            id: `line-${index}`,
            text: line.text.trim(),
            boundingBox: {
              x: line.bbox.x0,
              y: line.bbox.y0,
              width: line.bbox.x1 - line.bbox.x0,
              height: line.bbox.y1 - line.bbox.y0
            }
          }));
      }
      // If still no data, try to split full text by lines and create estimated blocks
      else if (data.text && data.text.trim()) {
        console.log("Creating estimated text blocks from full text");
        const lines = data.text.trim().split('\n').filter(line => line.trim());
        extractedBlocks = lines.map((line, index) => ({
          id: `estimated-line-${index}`,
          text: line.trim(),
          boundingBox: {
            x: 10,
            y: index * 30 + 10, // Estimate vertical spacing
            width: Math.min(line.length * 12, 800), // Estimate width based on character count
            height: 25
          }
        }));
      }
      
      console.log(`추출된 텍스트 블록 수: ${extractedBlocks.length}`);
      setExtractedTextBlocks(extractedBlocks);
      
      await worker.terminate();
    } catch (error) {
      console.error("Tesseract OCR 처리 중 오류:", error);
      toast.error("텍스트 인식 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processOCR = async (imageDataUrl: string) => {
    if (isPremiumUser) {
      await processOCRWithGoogleVision(imageDataUrl);
    } else {
      await processOCRWithTesseract(imageDataUrl);
    }
  };

  const getImageCoordinates = () => {
    const imageElement = document.querySelector('img[data-ocr-image="true"]') as HTMLImageElement;
    if (!imageElement) return null;
    
    const rect = imageElement.getBoundingClientRect();
    const naturalWidth = imageElement.naturalWidth;
    const naturalHeight = imageElement.naturalHeight;
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    const scaleX = displayWidth / naturalWidth;
    const scaleY = displayHeight / naturalHeight;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledWidth = naturalWidth * scale;
    const scaledHeight = naturalHeight * scale;
    const offsetX = (displayWidth - scaledWidth) / 2;
    const offsetY = (displayHeight - scaledHeight) / 2;
    
    return {
      rect,
      scale,
      offsetX,
      offsetY,
      scaledWidth,
      scaledHeight
    };
  };

  const getTextsInSelection = (selection: SelectionBox) => {
    const coords = getImageCoordinates();
    if (!coords) return [];
    
    const { scale, offsetX, offsetY } = coords;
    
    const minX = Math.min(selection.startX, selection.endX) - offsetX;
    const maxX = Math.max(selection.startX, selection.endX) - offsetX;
    const minY = Math.min(selection.startY, selection.endY) - offsetY;
    const maxY = Math.max(selection.startY, selection.endY) - offsetY;
    
    return extractedTextBlocks.filter(block => {
      const blockX = block.boundingBox.x * scale;
      const blockY = block.boundingBox.y * scale;
      const blockRight = blockX + (block.boundingBox.width * scale);
      const blockBottom = blockY + (block.boundingBox.height * scale);
      
      return (
        blockX >= minX && blockRight <= maxX &&
        blockY >= minY && blockBottom <= maxY
      );
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getImageCoordinates();
    if (!coords) return;
    
    const x = e.clientX - coords.rect.left;
    const y = e.clientY - coords.rect.top;
    
    setStartPoint({ x, y });
    setIsSelecting(true);
    setSelectionBox({
      startX: x,
      startY: y,
      endX: x,
      endY: y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !startPoint) return;
    
    const coords = getImageCoordinates();
    if (!coords) return;
    
    const x = e.clientX - coords.rect.left;
    const y = e.clientY - coords.rect.top;
    
    setSelectionBox({
      startX: startPoint.x,
      startY: startPoint.y,
      endX: x,
      endY: y
    });
  };

  const handleMouseUp = () => {
    if (!isSelecting || !selectionBox) return;
    
    const selectedBlocks = getTextsInSelection(selectionBox);
    if (selectedBlocks.length > 0) {
      const newTexts = selectedBlocks.map(block => block.text);
      setSelectedTexts(prev => [...prev, ...newTexts]);
    }
    
    setIsSelecting(false);
    setSelectionBox(null);
    setStartPoint(null);
  };

  const handleTextClick = (text: string) => {
    if (selectedTexts.includes(text)) {
      setSelectedTexts(prev => prev.filter(t => t !== text));
    } else {
      setSelectedTexts(prev => [...prev, text]);
    }
  };

  const handleConfirmSelection = () => {
    const combinedText = selectedTexts.join(" ");
    onTextExtracted(combinedText);
    resetState();
    onClose();
  };

  const resetState = () => {
    setPhoto("");
    setExtractedTextBlocks([]);
    setSelectedTexts([]);
    setIsSelecting(false);
    setSelectionBox(null);
    setStartPoint(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            텍스트 추출 {isPremiumUser && <Badge variant="secondary" className="ml-2">Premium (Google Vision)</Badge>}
            {!isPremiumUser && <Badge variant="outline" className="ml-2">Free (Tesseract)</Badge>}
          </DialogTitle>
        </DialogHeader>

        {!photo ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              카메라로 촬영하거나 갤러리에서 이미지를 선택하세요.
            </p>
            <div className="flex gap-4">
              <Button onClick={takePicture} className="flex-1">
                카메라로 촬영
              </Button>
              <Button onClick={pickFromGallery} variant="outline" className="flex-1">
                갤러리에서 선택
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isProcessing ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isPremiumUser ? "Google Vision으로 텍스트를 인식하고 있습니다..." : "Tesseract로 텍스트를 인식하고 있습니다..."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div 
                  className="relative border rounded-lg overflow-hidden"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                  <img
                    src={photo}
                    alt="Captured"
                    className="w-full h-auto"
                    data-ocr-image="true"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                  
                  {/* Text blocks overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {extractedTextBlocks.map((block) => {
                      const coords = getImageCoordinates();
                      if (!coords) return null;
                      
                      const { scale, offsetX, offsetY } = coords;
                      const x = block.boundingBox.x * scale + offsetX;
                      const y = block.boundingBox.y * scale + offsetY;
                      const width = block.boundingBox.width * scale;
                      const height = block.boundingBox.height * scale;
                      
                      return (
                        <div
                          key={block.id}
                          className={`absolute border-2 cursor-pointer pointer-events-auto ${
                            selectedTexts.includes(block.text)
                              ? 'border-blue-500 bg-blue-500/20'
                              : 'border-red-500 bg-red-500/10'
                          }`}
                          style={{
                            left: x,
                            top: y,
                            width,
                            height,
                          }}
                          onClick={() => handleTextClick(block.text)}
                          title={block.text}
                        />
                      );
                    })}
                  </div>
                  
                  {/* Selection box */}
                  {selectionBox && (
                    <div
                      className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
                      style={{
                        left: Math.min(selectionBox.startX, selectionBox.endX),
                        top: Math.min(selectionBox.startY, selectionBox.endY),
                        width: Math.abs(selectionBox.endX - selectionBox.startX),
                        height: Math.abs(selectionBox.endY - selectionBox.startY),
                      }}
                    />
                  )}
                </div>

                {/* 텍스트 목록 숨김 */}

                <div className="flex gap-2">
                  <Button
                    onClick={handleConfirmSelection}
                    disabled={selectedTexts.length === 0}
                    className="flex-1"
                  >
                    선택 완료
                  </Button>
                  <Button
                    onClick={() => processOCR(photo)}
                    variant="outline"
                    disabled={isProcessing}
                  >
                    다시 인식
                  </Button>
                  <Button
                    onClick={() => setPhoto("")}
                    variant="outline"
                  >
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

export default OCRCamera;