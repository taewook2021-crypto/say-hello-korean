import { useState, useCallback } from 'react';
import { createWorker, PSM } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// PDF.js worker setup
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.js';

export interface OcrOptions {
  language?: string;
  pageSegMode?: PSM;
  dpi?: number;
}

export interface OcrProgress {
  status: string;
  progress: number;
}

export function useOcr() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);

  const processFile = useCallback(async (
    file: File, 
    options: OcrOptions = {}
  ): Promise<string> => {
    const { language = 'kor', pageSegMode = PSM.AUTO, dpi = 300 } = options;
    
    setIsProcessing(true);
    setProgress({ status: 'Initializing...', progress: 0 });

    try {
      // Create worker
      const worker = await createWorker(language, 1, {
        logger: (m) => {
          if (m.status && typeof m.progress === 'number') {
            setProgress({ status: m.status, progress: m.progress });
          }
        }
      });

      await worker.setParameters({
        tessedit_pageseg_mode: pageSegMode,
        tessedit_char_whitelist: '',
        tessedit_ocr_engine_mode: 1, // LSTM OCR Engine
        preserve_interword_spaces: '1',
        tessedit_create_hocr: '0',
        tessedit_create_tsv: '0',
        tessedit_create_pdf: '0',
      });

      let text = '';

      // Image preprocessing function
      const preprocessImage = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
        const ctx = canvas.getContext('2d')!;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Convert to grayscale and enhance contrast
        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          
          // Enhance contrast (simple threshold)
          const enhanced = gray > 127 ? Math.min(255, gray + 30) : Math.max(0, gray - 30);
          
          data[i] = enhanced;     // red
          data[i + 1] = enhanced; // green  
          data[i + 2] = enhanced; // blue
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
      };

      if (file.type === 'application/pdf') {
        // Handle PDF files
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          setProgress({ status: `Processing page ${i}/${pdf.numPages}`, progress: i / pdf.numPages });
          
          const page = await pdf.getPage(i);
          // Higher scale for better quality
          const viewport = page.getViewport({ scale: dpi / 72 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({ canvasContext: context, viewport }).promise;
          
          // Preprocess image for better OCR
          const processedCanvas = preprocessImage(canvas);
          const { data: { text: pageText } } = await worker.recognize(processedCanvas);
          text += pageText + '\n\n';
        }
      } else {
        // Handle image files - preprocess for better quality
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        await new Promise((resolve, reject) => {
          img.onload = () => {
            // Scale up small images for better OCR
            const scale = Math.max(1, 800 / Math.max(img.width, img.height));
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(null);
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });

        const processedCanvas = preprocessImage(canvas);
        const { data: { text: imageText } } = await worker.recognize(processedCanvas);
        text = imageText;
      }

      await worker.terminate();
      
      // Clean up text - 더 정확한 후처리
      text = text
        .replace(/\s+/g, ' ') // 다중 공백을 단일 공백으로
        .replace(/([.!?])\s*\n\s*/g, '$1\n') // 문장 끝 줄바꿈 정리
        .replace(/\n{3,}/g, '\n\n') // 과도한 줄바꿈 제거
        .replace(/^\s+|\s+$/gm, '') // 각 줄의 앞뒤 공백 제거
        .trim();

      return text;

    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('OCR 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, []);

  return {
    processFile,
    isProcessing,
    progress
  };
}