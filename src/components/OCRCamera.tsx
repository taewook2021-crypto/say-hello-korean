import { useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import Tesseract from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";

interface OCRCameraProps {
  onTextExtracted: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const OCRCamera: React.FC<OCRCameraProps> = ({ onTextExtracted, isOpen, onClose }) => {
  const [photo, setPhoto] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [selectedRanges, setSelectedRanges] = useState<Array<{start: number, end: number}>>([]);
  const { isPremiumUser } = useSubscription();

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

      // Extract full text from response
      if (data.fullText) {
        setExtractedText(data.fullText);
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
      
      const recognizedText = result.data.text;
      console.log('Tesseract OCR result:', recognizedText);
      setExtractedText(recognizedText);
      
      await worker.terminate();
    } catch (error) {
      console.error('Tesseract OCR error:', error);
      throw error;
    }
  };

  const processOCR = async (imageDataUrl: string) => {
    try {
      setIsProcessing(true);
      
      if (isPremiumUser) {
        await processOCRWithGoogleVision(imageDataUrl);
      } else {
        await processOCRWithTesseract(imageDataUrl);
      }
    } catch (error) {
      console.error('OCR 처리 중 오류:', error);
      toast.error('OCR 처리 중 오류가 발생했습니다. Tesseract로 대체합니다.');
      
      // Google Vision 실패 시 Tesseract로 대체
      try {
        await processOCRWithTesseract(imageDataUrl);
      } catch (tesseractError) {
        console.error('Tesseract OCR 오류:', tesseractError);
        toast.error('텍스트 인식에 실패했습니다.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    const selectedText = getSelectedText();
    if (selectedText.trim()) {
      onTextExtracted(selectedText);
      handleClose();
    } else if (extractedText.trim()) {
      onTextExtracted(extractedText);
      handleClose();
    }
  };

  const getSelectedText = () => {
    if (selectedRanges.length === 0) return extractedText;
    
    // Sort ranges by start position
    const sortedRanges = [...selectedRanges].sort((a, b) => a.start - b.start);
    
    return sortedRanges
      .map(range => extractedText.slice(range.start, range.end))
      .join(' ');
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Check if selection is within our text area
    const textArea = document.getElementById('ocr-text-area');
    if (!textArea || !textArea.contains(container)) return;

    const startOffset = range.startOffset;
    const endOffset = range.endOffset;
    
    if (startOffset === endOffset) return;

    // Add new selection range
    const newRange = { start: startOffset, end: endOffset };
    setSelectedRanges(prev => {
      // Remove overlapping ranges and add new one
      const filtered = prev.filter(existing => 
        !(existing.start < newRange.end && existing.end > newRange.start)
      );
      return [...filtered, newRange];
    });
  };

  const clearSelections = () => {
    setSelectedRanges([]);
    window.getSelection()?.removeAllRanges();
  };

  const renderHighlightedText = () => {
    if (selectedRanges.length === 0) {
      return extractedText;
    }

    // Sort ranges by start position
    const sortedRanges = [...selectedRanges].sort((a, b) => a.start - b.start);
    const result = [];
    let lastIndex = 0;

    for (const range of sortedRanges) {
      // Add text before highlight
      if (lastIndex < range.start) {
        result.push(extractedText.slice(lastIndex, range.start));
      }
      
      // Add highlighted text
      result.push(
        <mark key={`highlight-${range.start}-${range.end}`} className="bg-blue-200">
          {extractedText.slice(range.start, range.end)}
        </mark>
      );
      
      lastIndex = range.end;
    }

    // Add remaining text
    if (lastIndex < extractedText.length) {
      result.push(extractedText.slice(lastIndex));
    }

    return result;
  };

  const resetState = () => {
    setPhoto("");
    setExtractedText("");
    setSelectedRanges([]);
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
                <div className="relative border rounded-lg overflow-hidden">
                  <img
                    src={photo}
                    alt="Captured"
                    className="w-full h-auto"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                </div>

                {extractedText && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">인식된 텍스트:</p>
                      <div className="flex gap-2">
                        {selectedRanges.length > 0 && (
                          <Button 
                            onClick={clearSelections} 
                            variant="outline" 
                            size="sm"
                            className="text-xs"
                          >
                            선택 해제
                          </Button>
                        )}
                      </div>
                    </div>
                    <div 
                      id="ocr-text-area"
                      className="p-3 bg-gray-50 rounded border text-sm max-h-32 overflow-y-auto cursor-text select-text"
                      onMouseUp={handleTextSelection}
                      style={{ userSelect: 'text' }}
                    >
                      {renderHighlightedText()}
                    </div>
                    {selectedRanges.length > 0 && (
                      <div className="p-2 bg-blue-50 rounded border text-xs">
                        <p className="font-medium text-blue-800 mb-1">선택된 텍스트:</p>
                        <p className="text-blue-700">{getSelectedText()}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      💡 원하는 텍스트를 마우스로 드래그하여 선택하세요. 여러 구간 선택 가능합니다.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleConfirm}
                    disabled={!extractedText.trim()}
                    className="flex-1"
                  >
                    {selectedRanges.length > 0 ? '선택된 텍스트 사용' : '전체 텍스트 사용'}
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