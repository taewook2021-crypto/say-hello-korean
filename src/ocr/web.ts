import { WebPlugin } from '@capacitor/core';
import type { OcrPlugin, OcrResult } from './index';
// @ts-ignore
import Tesseract from 'tesseract.js';

export class OcrWeb extends WebPlugin implements OcrPlugin {
  async extractText({ uri }: { uri: string; opts?: any }): Promise<OcrResult> {
    const { data } = await Tesseract.recognize(uri, 'kor+eng');

    const blocks = (data.blocks || []).map((b: any) => ({
      text: b.text || '',
      bbox: { x: b.bbox.x0, y: b.bbox.y0, w: b.bbox.x1 - b.bbox.x0, h: b.bbox.y1 - b.bbox.y0 },
      confidence: b.confidence ? b.confidence / 100 : undefined,
    }));

    return {
      text: data.text || '',
      blocks,
      language: 'ko',
    };
  }
}
