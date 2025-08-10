// 가벼운 Tesseract.js 래퍼: 동적 import로 초기 번들 최소화
export type OcrResult = {
  text: string;
  blocks: { text: string; bbox: { x: number; y: number; w: number; h: number }; confidence?: number }[];
};

let _tess: any | null = null;
async function getTesseract() {
  if (_tess) return _tess;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const Tesseract = (await import("tesseract.js")).default || (await import("tesseract.js"));
  _tess = Tesseract;
  return _tess;
}

export async function recognize(canvasOrUrl: HTMLCanvasElement | string, lang = "kor+eng"): Promise<OcrResult> {
  const Tesseract = await getTesseract();

  const { data } = await Tesseract.recognize(canvasOrUrl, lang, {
    tessedit_pageseg_mode: 3,
  });

  const blocks = (data.blocks || []).map((b: any) => ({
    text: (b.text || "").trim(),
    bbox: { x: b.bbox.x0, y: b.bbox.y0, w: b.bbox.x1 - b.bbox.x0, h: b.bbox.y1 - b.bbox.y0 },
    confidence: b.confidence ? b.confidence / 100 : undefined,
  }));

  const text = (data.text || "")
    .replace(/-\n/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  return { text, blocks };
}
