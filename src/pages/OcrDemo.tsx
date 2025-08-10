import { useEffect, useRef, useState } from "react";
import OcrCanvas from "@/components/OcrCanvas";
import { preprocessImage } from "@/lib/imagePreprocess";
import { recognize } from "@/lib/ocr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function OcrDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const cropRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    document.title = "OCR 데모 | 웹 전용 Tesseract";
    const meta = document.querySelector('meta[name="description"]') || document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', '웹 전용 Tesseract.js OCR 데모 - 드래그 크롭과 전처리로 정확도 향상.');
    document.head.appendChild(meta);
    const link = document.querySelector('link[rel="canonical"]') || document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', '/ocr-demo');
    document.head.appendChild(link);
  }, []);

  const onCropChange = (crop: any, imgEl: HTMLImageElement | null) => {
    cropRef.current = crop;
    imgRef.current = imgEl;
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreviewUrl("");
    setText("");
  };

  const run = async () => {
    if (!imgRef.current) return;
    setLoading(true);
    try {
      const canvas = await preprocessImage(imgRef.current, {
        mode: "binary",
        tileSize: 32,
        C: 8,
        sharpen: false,
        rotation: 0,
        crop: cropRef.current ?? null,
      });

      // 미리보기(전처리 결과)
      setPreviewUrl(canvas.toDataURL("image/png"));

      const res = await recognize(canvas, "kor+eng");
      setText(res.text.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">웹 OCR 데모 (전처리 + 크롭)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <section className="space-y-3">
            <input aria-label="이미지 선택" type="file" accept="image/*" onChange={onPick} />
            <OcrCanvas file={file} onCropChange={onCropChange} />
            <Button onClick={run} disabled={!file || loading} variant="default">
              {loading ? "분석 중…" : "OCR 실행"}
            </Button>
          </section>

          {previewUrl && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">전처리 결과</h2>
              <img src={previewUrl} alt="전처리 결과 미리보기" className="max-w-full rounded border" loading="lazy" />
            </section>
          )}

          <article className="space-y-2">
            <h2 className="text-lg font-semibold">인식 결과</h2>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
            />
          </article>
        </CardContent>
      </Card>
    </div>
  );
}
