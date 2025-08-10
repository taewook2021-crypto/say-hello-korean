import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { createWorker, PSM } from "tesseract.js";
import { cn } from "@/lib/utils";
import { useOcr } from "@/hooks/useOcr";

interface OCRImageSelectorProps {
  file: File; // image only
  language: string;
  enhance?: boolean;
  onExtract: (text: string) => void;
}

interface LineBox {
  id: string;
  x: number; // in image natural px
  y: number;
  w: number;
  h: number;
  text?: string;
}

export function OCRImageSelector({ file, language, enhance = true, onExtract }: OCRImageSelectorProps) {
  const { toast } = useToast();
  const { processFile } = useOcr();

  const [imageUrl, setImageUrl] = useState<string>('');
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);
  const [loadingDetect, setLoadingDetect] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [lines, setLines] = useState<LineBox[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isExtracting, setIsExtracting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const modalImgRef = useRef<HTMLImageElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Load natural size
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setDetectError('이미지를 불러올 수 없습니다.');
    img.src = imageUrl;
  }, [imageUrl]);

  // Detect text lines using a fast Tesseract pass
  useEffect(() => {
    (async () => {
      if (!imgNatural || !imageUrl) return;
      setLoadingDetect(true);
      setDetectError(null);
      setLines([]);
      try {
        const worker = await createWorker(language);
        // 1차: 빠른 희소 텍스트 감지로 단어/라인을 최대한 얻기
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          preserve_interword_spaces: '1',
          user_defined_dpi: '260',
        });

        // Draw image to canvas (avoids blob URL/CORS issues) + lightweight preprocessing
        const baseImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = imageUrl;
        });

        // upscale small images for better OCR stability
        const targetW = Math.min(2400, Math.max(baseImg.naturalWidth, 1600));
        const scaleUp = targetW / baseImg.naturalWidth;
        const targetH = Math.round(baseImg.naturalHeight * scaleUp);

        const cnv = document.createElement('canvas');
        cnv.width = targetW;
        cnv.height = targetH;
        const cctx = cnv.getContext('2d')!;
        cctx.imageSmoothingEnabled = true;
        cctx.imageSmoothingQuality = 'high';
        // simple pre-processing: grayscale + contrast boost + slight brightness
        // (helps thin Korean glyphs from screenshots)
        // Note: Canvas filter is widely supported and fast
        // If not supported, it is just ignored by the browser
        // and Tesseract will still work on the drawn image.
        // @ts-ignore - filter exists in modern browsers
        cctx.filter = 'grayscale(100%) contrast(135%) brightness(110%)';
        cctx.drawImage(baseImg, 0, 0, targetW, targetH);

        // First pass
        let result = await worker.recognize(cnv);
        let data: any = result.data;
        let rawLines: any[] | undefined = (data as any).lines as any[] | undefined;
        let words: any[] | undefined = (data as any).words as any[] | undefined;

        // Fallback pass with AUTO if nothing found in SPARSE_TEXT
        if ((!rawLines || rawLines.length === 0) && (!words || words.length === 0)) {
          await worker.setParameters({
            tessedit_pageseg_mode: PSM.AUTO,
            preserve_interword_spaces: '1',
            user_defined_dpi: '300',
          });
          result = await worker.recognize(cnv);
          data = result.data;
          rawLines = (data as any).lines as any[] | undefined;
          words = (data as any).words as any[] | undefined;
        }

        await worker.terminate();


        const detected = (rawLines && rawLines.length ? rawLines : groupWordsIntoLines(words, cnv.height)).map((ln: any, idx: number) => {
          const bbox = ln.bbox || ln;
          const { x0, y0, x1, y1 } = bbox;
          const x = x0 ?? 0;
          const y = y0 ?? 0;
          const w = Math.max(1, (x1 ?? 0) - x);
          const h = Math.max(1, (y1 ?? 0) - y);
          return { id: `line-${idx}`, x, y, w, h, text: ln.text } as LineBox;
        });
        setLines(detected);
        if (!detected.length) {
          toast({ title: '라인을 찾지 못했어요', description: '전체 OCR을 사용하거나 확대 후 다시 시도하세요.' });
        }
      } catch (e) {
        console.error(e);
        setDetectError('문장 감지 중 오류가 발생했습니다.');
      } finally {
        setLoadingDetect(false);
      }
    })();
  }, [imageUrl, imgNatural, language, toast]);

  // Group words into line-like boxes if data.lines is missing
  function groupWordsIntoLines(words: any[] | undefined, imgH: number): Array<{ bbox: { x0: number; y0: number; x1: number; y1: number }, text?: string }> {
    if (!words || !words.length) return [];
    const items = words.map(w => ({
      x0: w.bbox?.x0 ?? 0,
      y0: w.bbox?.y0 ?? 0,
      x1: w.bbox?.x1 ?? 0,
      y1: w.bbox?.y1 ?? 0,
      text: w.text ?? ''
    }));
    // cluster by y center
    const lines: Array<{ y: number; x0: number; y0: number; x1: number; y1: number; texts: string[] }> = [];
    const tol = Math.max(6, Math.round(imgH * 0.01));
    for (const it of items) {
      const yCenter = (it.y0 + it.y1) / 2;
      let target = lines.find(l => Math.abs(l.y - yCenter) <= tol);
      if (!target) {
        target = { y: yCenter, x0: it.x0, y0: it.y0, x1: it.x1, y1: it.y1, texts: [it.text] };
        lines.push(target);
      } else {
        target.y = (target.y + yCenter) / 2;
        target.x0 = Math.min(target.x0, it.x0);
        target.y0 = Math.min(target.y0, it.y0);
        target.x1 = Math.max(target.x1, it.x1);
        target.y1 = Math.max(target.y1, it.y1);
        target.texts.push(it.text);
      }
    }
    // sort by top then left
    lines.sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0));
    return lines.map(l => ({ bbox: { x0: l.x0, y0: l.y0, x1: l.x1, y1: l.y1 }, text: l.texts.join(' ') }));
  }

  const scale = useMemo(() => {
    const imgEl = imgRef.current;
    if (!imgEl || !imgNatural) return { s: 1, ox: 0, oy: 0 };
    const s = imgEl.clientWidth / imgNatural.w;
    // Center vertically inside container
    const oy = (imgEl.clientHeight - imgNatural.h * s) / 2 || 0;
    return { s, ox: 0, oy: Math.max(0, oy) };
  }, [imgNatural, imageUrl, imgRef.current?.clientWidth, imgRef.current?.clientHeight]);

const scaleModal = useMemo(() => {
  const imgEl = modalImgRef.current;
  if (!imgEl || !imgNatural) return { s: 1, ox: 0, oy: 0 };
  const s = imgEl.clientWidth / imgNatural.w;
  // Center vertically inside container
  const oy = (imgEl.clientHeight - imgNatural.h * s) / 2 || 0;
  return { s, ox: 0, oy: Math.max(0, oy) };
}, [imgNatural, imageUrl, open]);

  const toggle = (id: string, multi: boolean) => {
    setSelected(prev => {
      const next = new Set(multi ? prev : []);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(lines.map(l => l.id)));
  const clearSel = () => setSelected(new Set());

  // Crop selected regions and OCR only those
  const handleExtract = async () => {
    if (!imgNatural || !imageUrl || selected.size === 0) {
      toast({ title: '선을 선택하세요', description: '원하는 문장을 클릭해 선택해주세요.', variant: 'destructive' });
      return;
    }
    setIsExtracting(true);
    try {
      // Load original image element once
      const baseImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = imageUrl;
      });

      const chosen = lines.filter(l => selected.has(l.id));

      const results: string[] = [];
      for (const ln of chosen) {
        // Add small padding
        const pad = Math.round(Math.max(2, Math.min(12, ln.h * 0.15)));
        const sx = Math.max(0, ln.x - pad);
        const sy = Math.max(0, ln.y - pad);
        const sw = Math.min(imgNatural.w - sx, ln.w + pad * 2);
        const sh = Math.min(imgNatural.h - sy, ln.h + pad * 2);

        const c = document.createElement('canvas');
        c.width = sw;
        c.height = sh;
        const cctx = c.getContext('2d')!;
        cctx.imageSmoothingEnabled = true;
        cctx.imageSmoothingQuality = 'high';
        cctx.drawImage(baseImg, sx, sy, sw, sh, 0, 0, sw, sh);

        // Convert canvas to blob and then File to reuse existing OCR pipeline
        const blob: Blob = await new Promise((resolve) => c.toBlob(b => resolve(b as Blob), 'image/png'));
        const regionFile = new File([blob], 'roi.png', { type: 'image/png' });
        const text = await processFile(regionFile, { language, enhance, dpi: 220, pageSegMode: PSM.SINGLE_BLOCK });
        if (text && text.trim()) results.push(text.trim());
      }

      const finalText = results.join('\n');
      if (finalText) {
        onExtract(finalText);
        toast({ title: '영역 OCR 완료', description: `${results.length}개 라인에서 텍스트를 추출했습니다.` });
      } else {
        toast({ title: '텍스트 없음', description: '선택한 영역에서 텍스트를 찾지 못했어요.', variant: 'destructive' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: '영역 OCR 실패', description: '선택 영역 처리 중 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">문장 선택 모드</Badge>
          {loadingDetect ? (
            <span className="text-muted-foreground">문장 감지 중…</span>
          ) : (
            <span className="text-muted-foreground">클릭으로 선택, Shift+클릭으로 여러 줄 선택</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>전체 화면</Button>
          <Button variant="outline" size="sm" onClick={selectAll} disabled={loadingDetect}>전체 선택</Button>
          <Button variant="ghost" size="sm" onClick={clearSel}>선택 해제</Button>
        </div>
      </div>

      <div ref={containerRef} className="relative border rounded-lg overflow-hidden">
        <img ref={imgRef} src={imageUrl} alt="이미지 미리보기" className="block w-full max-h-72 object-contain select-none" />
        {/* Overlay */}
        {!!lines.length && imgNatural && (
          <div className="absolute inset-0">
            {lines.map((ln) => {
              const left = ln.x * scale.s + scale.ox;
              const top = ln.y * scale.s + scale.oy;
              const width = ln.w * scale.s;
              const height = ln.h * scale.s;
              const isSel = selected.has(ln.id);
              return (
                <div
                  key={ln.id}
                  style={{ left, top, width, height }}
                  className={cn(
                    'absolute rounded-sm border transition-colors',
                    isSel ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(ln.id, e.shiftKey);
                  }}
                  role="button"
                  aria-label="텍스트 라인"
                />
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] h-[90vh] p-0">
          <div className="relative w-full h-full">
            <img ref={modalImgRef} src={imageUrl} alt="이미지 전체 화면 미리보기" className="block w-full h-full object-contain select-none" />
            {!!lines.length && imgNatural && (
              <div className="absolute inset-0">
                {lines.map((ln) => {
                  const left = ln.x * scaleModal.s + scaleModal.ox;
                  const top = ln.y * scaleModal.s + scaleModal.oy;
                  const width = ln.w * scaleModal.s;
                  const height = ln.h * scaleModal.s;
                  const isSel = selected.has(ln.id);
                  return (
                    <div
                      key={ln.id}
                      style={{ left, top, width, height }}
                      className={cn(
                        'absolute rounded-sm border transition-colors',
                        isSel ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggle(ln.id, e.shiftKey);
                      }}
                      role="button"
                      aria-label="텍스트 라인"
                    />
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex gap-2">
        <Button className="w-full" onClick={handleExtract} disabled={loadingDetect || isExtracting || selected.size === 0}>
          {isExtracting ? '선택 영역 OCR 중…' : `선택 영역 OCR (${selected.size}줄)`}
        </Button>
      </div>

      {detectError && <p className="text-sm text-destructive">{detectError}</p>}
    </div>
  );
}
