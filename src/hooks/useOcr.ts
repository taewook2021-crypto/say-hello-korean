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
      });

      let text = '';

      if (file.type === 'application/pdf') {
        // Handle PDF files
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          setProgress({ status: `Processing page ${i}/${pdf.numPages}`, progress: i / pdf.numPages });
          
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: dpi / 72 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({ canvasContext: context, viewport }).promise;
          
          const { data: { text: pageText } } = await worker.recognize(canvas);
          text += pageText + '\n\n';
        }
      } else {
        // Handle image files
        const { data: { text: imageText } } = await worker.recognize(file);
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