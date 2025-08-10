import { useRef, useState, useCallback } from "react";
import { createWorker, PSM } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

// pdf.js worker - CDN 경로 사용 (Vite/ESM 호환)
(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.js`;

export type OcrOptions = {
  languages?: string;        // "kor+eng" 추천
  pageSegMode?: number;      // Tesseract PSM (숫자)
  dpi?: number;              // PDF 렌더링 DPI (150~220 권장)
  mathMode?: boolean;        // 수식 위주 후처리
  tableMode?: boolean;       // 표 가독성 후처리
  cleanup?: boolean;         // 공백/줄바꿈/하이픈 정리
};

export type OcrProgress = {
  status: string;
  progress: number; // 0~1
};

export function useOcr(defaultOptions?: OcrOptions) {
  const workerRef = useRef<any>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);

  const ensureWorker = useCallback(async (languages: string, psm: number) => {
    if (workerRef.current) return workerRef.current;
    const worker: any = await (createWorker as any)({
      logger: (m: any) => {
        if (m.status && typeof m.progress === "number") {
          setProgress({ status: m.status, progress: m.progress });
        }
      },
    });
    await worker.loadLanguage(languages);
    await worker.initialize(languages);
    await worker.setParameters({ tessedit_pageseg_mode: String(psm) });
    workerRef.current = worker;
    return worker;
  }, []);

  const terminate = useCallback(async () => {
    if (workerRef.current) {
      await workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const renderPdfToImages = useCallback(async (file: File, dpi = 180) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
    const images: HTMLCanvasElement[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: dpi / 72 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      images.push(canvas);
    }
    return images;
  }, []);

  const postprocess = useCallback((text: string, opts: OcrOptions) => {
    let t = text;

    if (opts.cleanup !== false) {
      t = t.replace(/-\s*\n\s*/g, "");   // 하이픈+줄바꿈 연결
      t = t.replace(/[ \t]+\n/g, "\n");  // 줄 끝 공백 제거
      t = t.replace(/[ \t]{2,}/g, " ");  // 다중 공백 정리
      t = t.replace(/\n{3,}/g, "\n\n");  // 빈 줄 압축
    }
    if (opts.tableMode) {
      t = t.replace(/[ ]{3,}/g, "\t");   // 표 간격 탭화
    }
    if (opts.mathMode) {
      t = t.replace(/\bO\b/g, "0").replace(/\bl\b/g, "1");
      t = t.replace(/\s*([=+\-*/()])\s*/g, " $1 ");
    }
    return t.trim();
  }, []);

  const recognize = useCallback(
    async (input: File | HTMLCanvasElement | HTMLImageElement | string, opts?: OcrOptions) => {
      const options: OcrOptions = {
        languages: "kor+eng",
        pageSegMode: 3,
        dpi: 180,
        mathMode: false,
        tableMode: false,
        cleanup: true,
        ...(defaultOptions || {}),
        ...(opts || {}),
      };

      setBusy(true);
      setProgress({ status: "initializing", progress: 0 });

      try {
        if (input instanceof File && input.type === "application/pdf") {
          const canvases = await renderPdfToImages(input, options.dpi);
          const worker = await ensureWorker(options.languages!, options.pageSegMode!);
          const chunks: string[] = [];

          for (let i = 0; i < canvases.length; i++) {
            const { data: { text } } = await worker.recognize(canvases[i]);
            chunks.push(text);
          }
          return postprocess(chunks.join("\n\n===== Page Break =====\n\n"), options);
        }

        const worker = await ensureWorker(options.languages!, options.pageSegMode!);
        const { data: { text } } = await worker.recognize(input as any);
        return postprocess(text, options);
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [defaultOptions, ensureWorker, postprocess, renderPdfToImages]
  );

  return { recognize, busy, progress, terminate };
}

export { PSM };