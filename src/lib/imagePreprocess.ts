// 간단하고 빠른 전처리: grayscale → adaptive threshold(타일 기반) → 선택적 샤픈
export type PreprocessOptions = {
  mode?: "binary" | "grayscale";
  tileSize?: number;       // 16~64 권장
  C?: number;              // 임계치 보정값(5~15)
  sharpen?: boolean;
  rotation?: number;       // 도 단위 (필요시 ±1~2 정도)
  crop?: { x: number; y: number; w: number; h: number } | null;
};

export async function preprocessImage(
  img: HTMLImageElement,
  opts: PreprocessOptions = {}
): Promise<HTMLCanvasElement> {
  const { tileSize = 32, C = 8, mode = "binary", sharpen = false, rotation = 0, crop = null } = opts;

  // 원본 캔버스
  const src = document.createElement("canvas");
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  const w0 = img.naturalWidth, h0 = img.naturalHeight;

  // 회전/크롭 적용 후 그리기
  let drawW = w0, drawH = h0;
  if (rotation % 360 !== 0) {
    // 회전 시 캔버스 크기 맞춤(간단 처리: 정사각 영역 보전 x)
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
    drawW = Math.floor(w0 * cos + h0 * sin);
    drawH = Math.floor(h0 * cos + w0 * sin);
  }
  src.width = drawW; src.height = drawH;

  if (rotation % 360 !== 0) {
    sctx.translate(drawW / 2, drawH / 2);
    sctx.rotate((rotation * Math.PI) / 180);
    sctx.drawImage(img, -w0 / 2, -h0 / 2);
    sctx.setTransform(1, 0, 0, 1, 0, 0);
  } else {
    sctx.drawImage(img, 0, 0);
  }

  // 크롭
  let sx = 0, sy = 0, sw = drawW, sh = drawH;
  if (crop) {
    sx = Math.max(0, crop.x);
    sy = Math.max(0, crop.y);
    sw = Math.min(drawW - sx, crop.w);
    sh = Math.min(drawH - sy, crop.h);
  }

  const srcData = sctx.getImageData(sx, sy, sw, sh);
  const { data, width, height } = srcData;
  const gray = new Uint8ClampedArray(width * height);

  // 1) 그레이스케일
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // perceptual gray
    gray[j] = (r * 299 + g * 587 + b * 114) / 1000;
  }

  // 2) mode === "grayscale"면 여기서 리턴
  if (mode === "grayscale") {
    const out = document.createElement("canvas");
    out.width = width; out.height = height;
    const octx = out.getContext("2d")!;
    const odata = octx.createImageData(width, height);
    for (let i = 0, j = 0; i < odata.data.length; i += 4, j++) {
      const v = gray[j];
      odata.data[i] = v; odata.data[i + 1] = v; odata.data[i + 2] = v; odata.data[i + 3] = 255;
    }
    octx.putImageData(odata, 0, 0);
    return out;
  }

  // 3) adaptive threshold (fast tile-based Sauvola-ish)
  const out = document.createElement("canvas");
  out.width = width; out.height = height;
  const octx = out.getContext("2d")!;
  const odata = octx.createImageData(width, height);
  const dst = odata.data;

  const ts = Math.max(8, tileSize);
  for (let ty = 0; ty < height; ty += ts) {
    for (let tx = 0; tx < width; tx += ts) {
      const bx = Math.min(ts, width - tx);
      const by = Math.min(ts, height - ty);

      // 타일 평균/표준편차
      let sum = 0, sum2 = 0, cnt = bx * by;
      for (let y = 0; y < by; y++) {
        const row = (ty + y) * width;
        for (let x = 0; x < bx; x++) {
          const v = gray[row + tx + x];
          sum += v; sum2 += v * v;
        }
      }
      const mean = sum / cnt;
      const variance = Math.max(0, sum2 / cnt - mean * mean);
      const std = Math.sqrt(variance);

      // 임계값 (mean - k*std - C) 스타일
      const k = 0.2; // 컨트라스트에 민감
      const thr = mean - k * std - C;

      for (let y = 0; y < by; y++) {
        const row = (ty + y) * width;
        for (let x = 0; x < bx; x++) {
          const idx = row + tx + x;
          const v = gray[idx];
          const bin = v < thr ? 0 : 255;
          const di = idx * 4;
          dst[di] = bin; dst[di + 1] = bin; dst[di + 2] = bin; dst[di + 3] = 255;
        }
      }
    }
  }

  // 4) 선택적 샤픈(간단 커널)
  if (sharpen) {
    const imgData = new ImageData(dst, width, height);
    const octx2 = out.getContext("2d")!;
    octx2.putImageData(imgData, 0, 0);

    const sharpened = octx2.getImageData(0, 0, width, height);
    const d = sharpened.data;
    const copy = new Uint8ClampedArray(d);

    const get = (x: number, y: number, c: number) => {
      x = Math.max(0, Math.min(width - 1, x));
      y = Math.max(0, Math.min(height - 1, y));
      return copy[(y * width + x) * 4 + c];
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < 3; c++) {
          const v = 5 * get(x, y, c)
            - get(x - 1, y, c) - get(x + 1, y, c)
            - get(x, y - 1, c) - get(x, y + 1, c);
          d[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, v));
        }
      }
    }
    octx2.putImageData(sharpened, 0, 0);
    return out;
  } else {
    const octx3 = out.getContext("2d")!;
    octx3.putImageData(odata, 0, 0);
    return out;
  }
}
