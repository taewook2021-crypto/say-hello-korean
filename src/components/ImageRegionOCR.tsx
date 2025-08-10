import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOcr, type OcrOptions } from "@/hooks/useOcr";
import { Trash2, ScanLine, ZoomIn, ZoomOut } from "lucide-react";

type Rect = { x: number; y: number; w: number; h: number };

interface Props {
  imageUrl: string;
  options: OcrOptions;
  onDone: (text: string) => void;
  onClose?: () => void;
}

// 이미지에서 드래그로 영역을 여러 개 선택하고, 그 영역만 OCR 수행
export function ImageRegionOCR({ imageUrl, options, onDone, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [rects, setRects] = useState<Rect[]>([]);
  const [draft, setDraft] = useState<Rect | null>(null);
  const [scale, setScale] = useState(1);
  const [busyLocal, setBusyLocal] = useState(false);

  const { processFile, isProcessing: busy, progress } = useOcr();

  // 이미지 로드 및 초기 배율
  useEffect(() => {
    const img = new Image();
    imgRef.current = img;
    img.onload = () => {
      fitToWidth();
      draw();
    };
    img.src = imageUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  // 컨테이너 폭에 맞춰 배율 계산
  const fitToWidth = () => {
    const img = imgRef.current;
    const cvs = canvasRef.current;
    const wrap = wrapRef.current;
    if (!img || !cvs || !wrap) return;
    const maxW = wrap.clientWidth || 720;
    const s = Math.min(1, maxW / img.naturalWidth);
    setScale(s);
    cvs.width = Math.round(img.naturalWidth * s);
    cvs.height = Math.round(img.naturalHeight * s);
    draw();
  };

  // 캔버스 그리기
  const draw = () => {
    const img = imgRef.current;
    const cvs = canvasRef.current;
    if (!img || !cvs) return;
    const ctx = cvs.getContext("2d")!;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high" as any;
    ctx.drawImage(img, 0, 0, cvs.width, cvs.height);

    // 기존 사각형 (이미지 좌표 -> 화면 좌표로 변환하여 그림)
    ctx.strokeStyle = "rgba(59,130,246,1)"; // primary-ish
    ctx.fillStyle = "rgba(59,130,246,0.12)";
    const s = scale;
    rects.forEach((r) => {
      const x = Math.round(r.x * s);
      const y = Math.round(r.y * s);
      const w = Math.round(r.w * s);
      const h = Math.round(r.h * s);
      ctx.fillRect(x, y, w, h);
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    });

    // 드래프트
    if (draft) {
      const x = Math.round(draft.x * s);
      const y = Math.round(draft.y * s);
      const w = Math.round(draft.w * s);
      const h = Math.round(draft.h * s);
      ctx.fillStyle = "rgba(234,88,12,0.14)"; // amber-ish
      ctx.strokeStyle = "rgba(234,88,12,1)";
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    }
  };

  // 포인터 이벤트로 드래그 선택 (이미지 원본 좌표로 저장)
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    let startXImg = 0,
      startYImg = 0,
      dragging = false;

    const toLocal = (e: PointerEvent) => {
      const rect = cvs.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const down = (e: PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const p = toLocal(e);
      startXImg = p.x / scale;
      startYImg = p.y / scale;
      dragging = true;
      setDraft({ x: startXImg, y: startYImg, w: 0, h: 0 });
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const p = toLocal(e);
      const currXImg = p.x / scale;
      const currYImg = p.y / scale;
      const x = Math.min(startXImg, currXImg);
      const y = Math.min(startYImg, currYImg);
      const w = Math.abs(currXImg - startXImg);
      const h = Math.abs(currYImg - startYImg);
      setDraft({ x, y, w, h });
      requestAnimationFrame(draw);
    };
    const up = (_e: PointerEvent) => {
      dragging = false;
      if (draft && draft.w * scale > 10 && draft.h * scale > 10) {
        setRects((prev) => [...prev, draft]);
      }
      setDraft(null);
      requestAnimationFrame(draw);
    };

    cvs.addEventListener("pointerdown", down);
    cvs.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      cvs.removeEventListener("pointerdown", down);
      cvs.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, rects, scale]);

  // 컨테이너/윈도우 리사이즈 시 재계산
  useEffect(() => {
    const onResize = () => fitToWidth();
    window.addEventListener("resize", onResize);
    const wrap = wrapRef.current;
    let ro: ResizeObserver | null = null;
    if (wrap && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => fitToWidth());
      ro.observe(wrap);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 줌 제어
  const zoom = (factor: number) => {
    const img = imgRef.current;
    const cvs = canvasRef.current;
    if (!img || !cvs) return;
    setScale((s) => {
      const next = Math.min(3, Math.max(0.4, s * factor));
      cvs.width = Math.round(img.naturalWidth * next);
      cvs.height = Math.round(img.naturalHeight * next);
      requestAnimationFrame(draw);
      return next;
    });
  };

  // 선택 영역 OCR
  const runRegionOcr = async () => {
    const img = imgRef.current;
    const cvs = canvasRef.current;
    if (!img || !cvs || rects.length === 0) return;

    setBusyLocal(true);
    try {
      const results: string[] = [];
      for (const r of rects) {
        const sx = Math.round(r.x);
        const sy = Math.round(r.y);
        const sw = Math.round(r.w);
        const sh = Math.round(r.h);

        const crop = document.createElement("canvas");
        crop.width = sw;
        crop.height = sh;
        const cctx = crop.getContext("2d")!;
        cctx.imageSmoothingEnabled = true;
        cctx.imageSmoothingQuality = "high" as any;
        cctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        const blob: Blob = await new Promise((resolve) => crop.toBlob((b) => resolve(b as Blob), "image/png"));
        const regionFile = new File([blob], "roi.png", { type: "image/png" });
        const text = await processFile(regionFile, { ...options });
        if (text && text.trim()) results.push(text.trim());
      }
      const joined = results.filter(Boolean).join("\n\n");
      onDone(joined);
    } finally {
      setBusyLocal(false);
    }
  };

  const canOCR = rects.length > 0 && !busy && !busyLocal;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <ScanLine className="h-4 w-4" />
          <span>이미지 위를 드래그해 여러 영역을 선택하세요.</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => zoom(0.85)} aria-label="축소">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => zoom(1.15)} aria-label="확대">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRects([]);
              draw();
            }}
          >
            <Trash2 className="h-4 w-4" /> 초기화
          </Button>
        </div>
      </div>

      <div ref={wrapRef} className="w-full">
        <canvas
          ref={canvasRef}
          className="w-full rounded-md border"
          style={{ touchAction: "none", userSelect: "none" }}
        />
      </div>

      {(busy || busyLocal) && (
        <div className="space-y-2">
          <div className="text-sm flex items-center gap-2">
            <span>처리 중…</span>
            <span className="ml-auto">{Math.round((progress?.progress || 0) * 100)}%</span>
          </div>
          <Progress value={(progress?.progress || 0) * 100} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">선택 영역: <b>{rects.length}</b>개</div>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>닫기</Button>
          )}
          <Button onClick={runRegionOcr} disabled={!canOCR}>
            선택 영역 OCR
          </Button>
        </div>
      </div>
    </div>
  );
}
