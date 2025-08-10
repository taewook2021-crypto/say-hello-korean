import { registerPlugin } from '@capacitor/core';

export type OcrOptions = {
  lang?: string[];
  crop?: { x: number; y: number; w: number; h: number };
  detectParagraphs?: boolean;
};

export type OcrBlock = {
  text: string;
  bbox: { x: number; y: number; w: number; h: number };
  confidence?: number;
  lines?: string[];
};

export type OcrResult = {
  text: string;
  blocks: OcrBlock[];
  language?: string;
};

export interface OcrPlugin {
  extractText(options: { uri: string; opts?: OcrOptions }): Promise<OcrResult>;
}

export const Ocr = registerPlugin<OcrPlugin>('Ocr', {
  web: () => import('./web').then(m => new m.OcrWeb()),
});

export async function extractText(uri: string, opts?: OcrOptions): Promise<OcrResult> {
  const res = await Ocr.extractText({ uri, opts });
  res.text = res.text
    .replace(/-\n/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  return res;
}
