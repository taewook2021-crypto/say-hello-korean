import { useEffect, useRef, useState } from "react";

type Props = {
  file: File | null;
  onCropChange?: (crop: { x: number; y: number; w: number; h: number } | null, imgEl: HTMLImageElement | null) => void;
};

export default function OcrCanvas({ file, onCropChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [drag, setDrag] = useState<{ sx: number; sy: number; ex: number; ey: number } | null>(null);

  useEffect(() => {
    if (!file) { setImgEl(null); setCrop(null); onCropChange?.(null, null); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { setImgEl(img); URL.revokeObjectURL(url); };
    img.src = url;
  }, [file, onCropChange]);

  useEffect(() => {
    const cvs = canvasRef.current;
    const ctx = cvs?.getContext("2d");
    if (!cvs || !ctx) return;
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    if (!imgEl) return;

    // 캔버스 크기 맞춤(가로 폭 기준)
    const maxW = Math.min(1080, window.innerWidth - 40);
    const scale = imgEl.naturalWidth > maxW ? maxW / imgEl.naturalWidth : 1;
    cvs.width = Math.floor(imgEl.naturalWidth * scale);
    cvs.height = Math.floor(imgEl.naturalHeight * scale);

    ctx.drawImage(imgEl, 0, 0, cvs.width, cvs.height);

    if (crop) {
      ctx.save();
      ctx.strokeStyle = "rgba(59,130,246,1)"; // primary
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(crop.x * scale, crop.y * scale, crop.w * scale, crop.h * scale);
      ctx.restore();
    }

    // 드래그 중 시각화
    if (drag) {
      const x = Math.min(drag.sx, drag.ex) * (cvs.width / (imgEl.naturalWidth));
      const y = Math.min(drag.sy, drag.ey) * (cvs.height / (imgEl.naturalHeight));
      const w = Math.abs(drag.ex - drag.sx) * (cvs.width / (imgEl.naturalWidth));
      const h = Math.abs(drag.ey - drag.sy) * (cvs.height / (imgEl.naturalHeight));
      ctx.save();
      ctx.strokeStyle = "rgba(234,88,12,1)"; // accent
      ctx.fillStyle = "rgba(234,88,12,0.12)";
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
  }, [imgEl, crop, drag]);

  const toImageCoords = (clientX: number, clientY: number) => {
    const cvs = canvasRef.current!;
    const rect = cvs.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const scaleX = imgEl ? imgEl.naturalWidth / cvs.width : 1;
    const scaleY = imgEl ? imgEl.naturalHeight / cvs.height : 1;

    return { x: Math.max(0, Math.min(imgEl?.naturalWidth || 0, x * scaleX)),
             y: Math.max(0, Math.min(imgEl?.naturalHeight || 0, y * scaleY)) };
  };

  const onDown = (e: React.MouseEvent) => {
    if (!imgEl) return;
    const p = toImageCoords(e.clientX, e.clientY);
    setDrag({ sx: p.x, sy: p.y, ex: p.x, ey: p.y });
  };
  const onMove = (e: React.MouseEvent) => {
    if (!drag) return;
    const p = toImageCoords(e.clientX, e.clientY);
    setDrag({ ...drag, ex: p.x, ey: p.y });
  };
  const onUp = () => {
    if (!drag || !imgEl) return;
    const x = Math.min(drag.sx, drag.ex);
    const y = Math.min(drag.sy, drag.ey);
    const w = Math.abs(drag.ex - drag.sx);
    const h = Math.abs(drag.ey - drag.sy);
    const c = w > 10 && h > 10 ? { x: Math.floor(x), y: Math.floor(y), w: Math.floor(w), h: Math.floor(h) } : null;
    setCrop(c);
    onCropChange?.(c, imgEl);
    setDrag(null);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        style={{ width: "100%", maxWidth: 1080, borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,.08)", cursor: "crosshair" }}
      />
      <p style={{ color: "#666", fontSize: 12, marginTop: 8 }}>영역을 드래그해서 OCR할 부분을 선택하세요.</p>
    </div>
  );
}
