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
  enhance?: boolean;
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
    const { language = 'kor', pageSegMode = PSM.AUTO, dpi = 300, enhance = true } = options;
    
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
        user_defined_dpi: String(dpi),
      });

      let text = '';

      // Enhanced preprocessing for mobile captures
      const preprocessImage = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
        if (!enhance) {
          // Basic preprocessing
          const ctx = canvas.getContext('2d')!;
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            const enhanced = gray > 127 ? Math.min(255, gray + 30) : Math.max(0, gray - 30);
            data[i] = enhanced;
            data[i + 1] = enhanced;
            data[i + 2] = enhanced;
          }

          ctx.putImageData(imageData, 0, 0);
          return canvas;
        }

        // Enhanced preprocessing for mobile captures
        const upscaled = upscaleIfSmall(canvas, 1200);
        const processed = document.createElement('canvas');
        processed.width = upscaled.width;
        processed.height = upscaled.height;
        const ctx = processed.getContext('2d')!;
        ctx.drawImage(upscaled, 0, 0);

        // Convert to grayscale
        let imageData = ctx.getImageData(0, 0, processed.width, processed.height);
        toGrayscale(imageData.data);
        ctx.putImageData(imageData, 0, 0);

        // Auto-invert if dark (for dark mode screenshots)
        autoInvertIfDark(ctx, processed.width, processed.height);

        // Adaptive binarization for better text recognition
        adaptiveBinarize(ctx, processed.width, processed.height);

        // Dilate to thicken text strokes
        dilateBinary(ctx, processed.width, processed.height);

        return processed;
      };

      // Helper functions for enhanced preprocessing
      const upscaleIfSmall = (input: HTMLCanvasElement, minWidth: number) => {
        if (input.width >= minWidth) return input;
        const scale = minWidth / input.width;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(input.width * scale);
        canvas.height = Math.round(input.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(input, 0, 0, canvas.width, canvas.height);
        return canvas;
      };

      const toGrayscale = (data: Uint8ClampedArray) => {
        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
      };

      const autoInvertIfDark = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Sample average brightness
        let sum = 0, count = 0;
        for (let i = 0; i < data.length; i += 4 * 16) {
          sum += data[i];
          count++;
        }
        const avgBrightness = sum / Math.max(count, 1);

        // Invert if dark (likely dark mode screenshot)
        if (avgBrightness < 110) {
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
          }
          ctx.putImageData(imageData, 0, 0);
        }
      };

      const adaptiveBinarize = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const tileSize = 32;
        const threshold = 10;

        // Calculate local means for each tile
        const cols = Math.ceil(width / tileSize);
        const rows = Math.ceil(height / tileSize);
        const means: number[][] = Array.from({ length: rows }, () => Array(cols).fill(127));

        for (let ty = 0; ty < rows; ty++) {
          for (let tx = 0; tx < cols; tx++) {
            let sum = 0, count = 0;
            for (let y = ty * tileSize; y < Math.min(height, (ty + 1) * tileSize); y += 2) {
              for (let x = tx * tileSize; x < Math.min(width, (tx + 1) * tileSize); x += 2) {
                const idx = (y * width + x) * 4;
                sum += data[idx];
                count++;
              }
            }
            means[ty][tx] = sum / Math.max(1, count);
          }
        }

        // Apply adaptive threshold
        for (let ty = 0; ty < rows; ty++) {
          for (let tx = 0; tx < cols; tx++) {
            const localThreshold = means[ty][tx] - threshold;
            for (let y = ty * tileSize; y < Math.min(height, (ty + 1) * tileSize); y++) {
              for (let x = tx * tileSize; x < Math.min(width, (tx + 1) * tileSize); x++) {
                const idx = (y * width + x) * 4;
                const value = data[idx] > localThreshold ? 255 : 0;
                data[idx] = value;
                data[idx + 1] = value;
                data[idx + 2] = value;
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
      };

      const dilateBinary = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const src = ctx.getImageData(0, 0, width, height);
        const dst = ctx.createImageData(width, height);
        const srcData = src.data;
        const dstData = dst.data;

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            let hasWhiteNeighbor = false;
            
            // Check 3x3 neighborhood
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const idx = ((y + dy) * width + (x + dx)) * 4;
                if (srcData[idx] === 255) {
                  hasWhiteNeighbor = true;
                  break;
                }
              }
              if (hasWhiteNeighbor) break;
            }

            const currentIdx = (y * width + x) * 4;
            const value = hasWhiteNeighbor ? 255 : 0;
            dstData[currentIdx] = value;
            dstData[currentIdx + 1] = value;
            dstData[currentIdx + 2] = value;
            dstData[currentIdx + 3] = 255;
          }
        }

        ctx.putImageData(dst, 0, 0);
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
            const scale = Math.max(1, 1600 / Math.max(img.width, img.height));
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
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