import { useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import Tesseract from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

interface OCRCameraProps {
  onTextExtracted: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const OCRCamera: React.FC<OCRCameraProps> = ({ onTextExtracted, isOpen, onClose }) => {
  const [photo, setPhoto] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedArea, setSelectedArea] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const isPremiumUser = false; // 인증 기능 제거됨

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
      }
    } catch (error) {
      console.error("Error picking from gallery:", error);
      toast.error("갤러리에서 이미지 선택에 실패했습니다.");
    }
  };

  const getRelativePosition = (event: React.MouseEvent, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const pos = getRelativePosition(event, img);
    setDragStart(pos);
    setIsDragging(true);
    setSelectedArea(null);
    setSelectedText("");
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!isDragging || !dragStart) return;

    const img = event.currentTarget;
    const pos = getRelativePosition(event, img);
    
    const area = {
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      width: Math.abs(pos.x - dragStart.x),
      height: Math.abs(pos.y - dragStart.y)
    };

    setSelectedArea(area);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (selectedArea && selectedArea.width > 10 && selectedArea.height > 10) {
      processSelectedArea();
    }
  };

  const processSelectedArea = async () => {
    if (!selectedArea || !photo) return;

    try {
      setIsProcessing(true);
      
      // Create a canvas to crop the selected area
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate actual image dimensions vs displayed dimensions
        const displayedImg = document.querySelector('#ocr-image') as HTMLImageElement;
        const scaleX = img.naturalWidth / displayedImg.clientWidth;
        const scaleY = img.naturalHeight / displayedImg.clientHeight;
        
        // Set canvas size to the cropped area
        canvas.width = selectedArea.width * scaleX;
        canvas.height = selectedArea.height * scaleY;
        
        // Draw the cropped area
        ctx?.drawImage(
          img,
          selectedArea.x * scaleX,
          selectedArea.y * scaleY,
          selectedArea.width * scaleX,
          selectedArea.height * scaleY,
          0,
          0,
          canvas.width,
          canvas.height
        );
        
        // Convert to data URL
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Process OCR on the cropped image
        if (isPremiumUser) {
          await processOCRWithGoogleVision(croppedDataUrl);
        } else {
          await processOCRWithTesseract(croppedDataUrl);
        }
      };
      
      img.src = photo;
    } catch (error) {
      console.error('Error processing selected area:', error);
      toast.error('선택된 영역 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processOCRWithGoogleVision = async (imageDataUrl: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-vision-ocr', {
        body: { imageBase64: imageDataUrl }
      });

      if (error) {
        throw new Error(`Supabase function error: ${error.message}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Google Vision OCR failed');
      }

      if (data.fullText) {
        setSelectedText(data.fullText.trim());
      } else {
        throw new Error('텍스트를 추출할 수 없습니다.');
      }
    } catch (error) {
      console.error('Google Vision OCR error:', error);
      throw error;
    }
  };

  const processOCRWithTesseract = async (imageDataUrl: string) => {
    try {
      const worker = await Tesseract.createWorker("kor");
      const result = await worker.recognize(imageDataUrl);
      
      const recognizedText = result.data.text.trim();
      setSelectedText(recognizedText);
      
      await worker.terminate();
    } catch (error) {
      console.error('Tesseract OCR error:', error);
      throw error;
    }
  };

  const handleConfirm = () => {
    if (selectedText.trim()) {
      onTextExtracted(selectedText);
      handleClose();
    }
  };

  const resetState = () => {
    setPhoto("");
    setSelectedArea(null);
    setSelectedText("");
    setIsDragging(false);
    setDragStart(null);
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
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                💡 사진에서 추출하고 싶은 텍스트 영역을 드래그하여 선택하세요.
              </p>
              <div className="relative border rounded-lg overflow-hidden inline-block">
                <img
                  id="ocr-image"
                  src={photo}
                  alt="Captured"
                  className="max-w-full h-auto cursor-crosshair"
                  style={{ maxHeight: '500px', objectFit: 'contain' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  draggable={false}
                />
                
                {/* Selection overlay */}
                {selectedArea && (
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none"
                    style={{
                      left: selectedArea.x,
                      top: selectedArea.y,
                      width: selectedArea.width,
                      height: selectedArea.height,
                    }}
                  />
                )}
              </div>
            </div>

            {isProcessing && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <p className="mt-2 text-sm text-muted-foreground">
                  선택된 영역의 텍스트를 인식하고 있습니다...
                </p>
              </div>
            )}

            {selectedText && (
              <div className="space-y-3">
                <p className="text-sm font-medium">추출된 텍스트:</p>
                <div className="p-3 bg-gray-50 rounded border text-sm">
                  {selectedText}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {selectedText ? (
                <>
                  <Button onClick={handleConfirm} className="flex-1">
                    이 텍스트 사용하기
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedArea(null);
                      setSelectedText("");
                    }}
                    variant="outline"
                  >
                    다시 선택
                  </Button>
                </>
              ) : (
                <Button onClick={() => setPhoto("")} variant="outline" className="flex-1">
                  다른 사진 선택
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OCRCamera;