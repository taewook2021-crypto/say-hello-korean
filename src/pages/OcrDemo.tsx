import { useState } from 'react';
import { extractText } from '@/ocr';

export default function OcrDemo() {
  const [img, setImg] = useState<string>('');
  const [out, setOut] = useState<string>('');

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setImg(url);
  };

  const run = async () => {
    if (!img) return;
    const res = await extractText(img, { lang: ['ko','en'] });
    setOut(res.text);
    document.title = 'OCR 데모 | 텍스트 추출';
  };

  return (
    <div>
      <header className="px-4 py-3">
        <h1 className="text-2xl font-bold">OCR 데모 (웹 폴백)</h1>
      </header>
      <main className="p-4 space-y-4">
        <section className="space-y-2">
          <input aria-label="이미지 선택" type="file" accept="image/*" onChange={onPick} />
          {img && (
            <img
              src={img}
              alt="OCR용 업로드 이미지 미리보기"
              className="max-w-full rounded border"
              loading="lazy"
            />
          )}
          <button onClick={run} className="px-3 py-2 rounded border">OCR 실행</button>
        </section>
        <article>
          <h2 className="text-lg font-semibold">결과</h2>
          <pre className="whitespace-pre-wrap text-sm p-3 rounded border bg-background">{out}</pre>
        </article>
        <link rel="canonical" href="/ocr-demo" />
      </main>
    </div>
  );
}
