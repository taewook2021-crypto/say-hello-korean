import { useRef, useState, useCallback } from "react";
import { createWorker, PSM } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

// pdf.js worker - CDN 경로 사용 (Vite/ESM 호환)
(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.js`;

// 전역 싱글톤 워커 (초기화 중복/재다운로드 방지)
let _workerPromise: Promise<any> | null = null;
let _worker: any | null = null;

export type OcrOptions = {
  languages?: string;        // "kor+eng" 추천
  pageSegMode?: number;      // Tesseract PSM (숫자)
  dpi?: number;              // PDF 렌더링 DPI (150~220 권장)
  mathMode?: boolean;        // 수식 위주 후처리
  tableMode?: boolean;       // 표 가독성 후처리
  cleanup?: boolean;         // 공백/줄바꿈/하이픈 정리
  stripAnswers?: boolean;    // "정답", "내 답" 등 답안 텍스트 제거
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
    // 이미 준비된 전역 워커가 있으면 재사용
    if (_worker) {
      workerRef.current = _worker;
      return _worker;
    }
    if (_workerPromise) return _workerPromise;

    // CDN 경로 명시 (SIMD 우선, 실패 시 일반 wasm)
    const coreBase = "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.2";
    const tesseractBase = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist";
    // 더 빠른 CDN 사용 (jsdelivr > projectnaptha)
    const langBase = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/lang-data";

    _workerPromise = (async () => {
      try {
        const w: any = await (createWorker as any)({
          corePath: `${coreBase}/tesseract-core-simd.wasm.js`,
          workerPath: `${tesseractBase}/worker.min.js`,
          langPath: langBase,
          logger: (m: any) => {
            if (m.status && typeof m.progress === "number") {
              setProgress({ status: m.status, progress: m.progress });
            }
          },
        });
        await w.loadLanguage(languages);
        await w.initialize(languages);
        await w.setParameters({ tessedit_pageseg_mode: String(psm) });
        _worker = w;
        workerRef.current = w;
        return w;
      } catch (err) {
        const w: any = await (createWorker as any)({
          corePath: `${coreBase}/tesseract-core.wasm.js`,
          workerPath: `${tesseractBase}/worker.min.js`,
          langPath: langBase,
          logger: (m: any) => {
            if (m.status && typeof m.progress === "number") {
              setProgress({ status: m.status, progress: m.progress });
            }
          },
        });
        await w.loadLanguage(languages);
        await w.initialize(languages);
        await w.setParameters({ tessedit_pageseg_mode: String(psm) });
        _worker = w;
        workerRef.current = w;
        return w;
      } finally {
        _workerPromise = null;
      }
    })();

    return _workerPromise;
  }, []);

  const terminate = useCallback(async () => {
    if (_worker) {
      await _worker.terminate();
      _worker = null;
      workerRef.current = null;
    }
  }, []);

  // 대형 이미지/캔버스 다운스케일링 유틸 (속도 ↑)
  const downscaleCanvas = (input: HTMLCanvasElement, maxW = 2200) => {
    if (input.width <= maxW) return input;
    const scale = maxW / input.width;
    const c = document.createElement("canvas");
    c.width = Math.round(input.width * scale);
    c.height = Math.round(input.height * scale);
    const cx = c.getContext("2d")!;
    cx.drawImage(input, 0, 0, c.width, c.height);
    return c;
  };

  const renderPdfToImages = useCallback(async (file: File, dpi = 150) => {
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
      await page.render({ canvasContext: ctx, viewport }).promise;
      images.push(downscaleCanvas(canvas, 2200));
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

    // 정답/내 답 제거
    if (opts.stripAnswers) {
      // 인라인 "(정답: ...)" / "정답: ..." / "(내 답: ...)" / "내 답: ..."
      t = t.replace(/\(?\s*(?:정답|내\s*답)\s*[:：]?\s*[^)\n]*\)?/gi, "");

      // 줄 단위로 "정답", "정답은", "내 답"으로 시작하는 라인 제거
      t = t
        .split("\n")
        .filter((line) => !/^\s*(?:정답은?|내\s*답)\b/i.test(line))
        .join("\n");
    }

    if (opts.tableMode) {
      t = t.replace(/[ ]{3,}/g, "\t");   // 표 간격 탭화
    }
    if (opts.mathMode) {
      t = t.replace(/\bO\b/g, "0").replace(/\bl\b/g, "1");
      t = t.replace(/\s*([=+\-*/()])\s*/g, " $1 ");
    }

    // 최종 정리
    t = t.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
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
        stripAnswers: true,
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

        // 캔버스 입력 시 다운스케일 적용
        if (typeof (input as any)?.getContext === "function") {
          const scaled = downscaleCanvas(input as HTMLCanvasElement, 2200);
          const { data: { text } } = await worker.recognize(scaled as any);
          return postprocess(text, options);
        }

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

// 사전 워밍업 API (페이지 진입/모달 오픈 시 호출 추천)
export async function prewarmOcr(languages = "kor", psm = 3) {
  if (_worker || _workerPromise) return;

  const coreBase = "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.2";
  const tesseractBase = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist";
  const langBase = "https://tessdata.projectnaptha.com/4.0.0";

  _workerPromise = (async () => {
    try {
      const w: any = await (createWorker as any)({
        corePath: `${coreBase}/tesseract-core-simd.wasm.js`,
        workerPath: `${tesseractBase}/worker.min.js`,
        langPath: langBase,
      });
      await w.loadLanguage(languages);
      await w.initialize(languages);
      await w.setParameters({ tessedit_pageseg_mode: String(psm) });
      _worker = w;
    } catch {
      const w: any = await (createWorker as any)({
        corePath: `${coreBase}/tesseract-core.wasm.js`,
        workerPath: `${tesseractBase}/worker.min.js`,
        langPath: langBase,
      });
      await w.loadLanguage(languages);
      await w.initialize(languages);
      await w.setParameters({ tessedit_pageseg_mode: String(psm) });
      _worker = w;
    } finally {
      _workerPromise = null;
    }
  })();

  return _workerPromise;
}

export { PSM };