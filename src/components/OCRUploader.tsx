import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useOcr, OcrOptions, PSM, prewarmOcr } from "@/hooks/useOcr";
import { Upload, ClipboardPaste, FileText, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

 type Props = {
  onTextExtracted: (text: string) => void;
};

const ACCEPTS = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
];

export function OCRUploader({ onTextExtracted }: Props) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<OcrOptions>({
    languages: "kor",
    pageSegMode: 4,
    dpi: 150,
    mathMode: false,
    tableMode: false,
    cleanup: true,
    stripAnswers: true,
  });

  const [warming, setWarming] = useState(false);
  const [warmedWith, setWarmedWith] = useState<{ languages: string; psm: number } | null>(null);
  const { recognize, busy, progress, terminate } = useOcr(options);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleFiles = useCallback((f: File) => {
    if (!ACCEPTS.includes(f.type)) {
      toast({
        title: "지원하지 않는 파일",
        description: "PNG/JPG/GIF/SVG/PDF만 지원합니다.",
        variant: "destructive",
      });
      return;
    }
    setFile(f);
    setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFiles(f);
  }, [handleFiles]);

  const onPaste = useCallback(async (e: ClipboardEvent) => {
    if (!e.clipboardData) return;
    for (const it of Array.from(e.clipboardData.items)) {
      if (it.type.startsWith("image/")) {
        const blob = it.getAsFile();
        if (blob) {
          handleFiles(new File([blob], "pasted.png", { type: blob.type }));
          break;
        }
      }
    }
  }, [handleFiles]);

  useEffect(() => {
    const dom = dropRef.current;
    if (!dom) return;
    const prevent = (e: Event) => e.preventDefault();
    dom.addEventListener("dragover", prevent);
    dom.addEventListener("drop", prevent);
    document.addEventListener("paste", onPaste as any);
    return () => {
      dom.removeEventListener("dragover", prevent);
      dom.removeEventListener("drop", prevent);
      document.removeEventListener("paste", onPaste as any);
      terminate();
    };
  }, [onPaste, terminate]);

  const ready = !!(warmedWith && warmedWith.languages === (options.languages || "kor") && warmedWith.psm === (options.pageSegMode || 3));

  const handlePrewarm = async () => {
    try {
      setWarming(true);
      await prewarmOcr(options.languages || "kor", (options.pageSegMode as number) || 3);
      setWarmedWith({ languages: options.languages || "kor", psm: (options.pageSegMode as number) || 3 });
      toast({ title: "언어 데이터 준비 완료", description: "이제 OCR 실행이 빨라집니다." });
    } catch (e: any) {
      toast({ title: "다운로드 오류", description: e?.message || "언어 데이터 준비 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setWarming(false);
    }
  };
  const runOcr = async () => {
    if (!file) return;
    try {
      const text = await recognize(file, options);
      if (!text) {
        toast({ title: "추출 실패", description: "텍스트를 추출하지 못했습니다.", variant: "destructive" });
        return;
      }
      onTextExtracted(text);
      toast({ title: "OCR 완료", description: "텍스트를 입력란에 붙였습니다." });
    } catch (e: any) {
      toast({ title: "OCR 오류", description: e?.message || "예기치 못한 오류", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div
          ref={dropRef}
          onDrop={onDrop}
          className="border-2 border-dashed rounded-xl p-6 text-center hover:bg-muted/40 transition"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Upload className="h-5 w-5" />
            <span className="font-medium">이미지/PDF를 드래그앤드롭하거나 선택하세요</span>
          </div>
          <Input
            type="file"
            accept={ACCEPTS.join(",")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFiles(f);
            }}
          />
          <div className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-2">
            <ClipboardPaste className="h-4 w-4" />
            클립보드에서 이미지를 붙여넣어도 됩니다 (Ctrl/Cmd + V)
          </div>

          {previewUrl && (
            <div className="mt-4">
              <img src={previewUrl} alt="preview" className="mx-auto max-h-64 rounded-md border" />
            </div>
          )}

          {file && file.type === "application/pdf" && (
            <div className="mt-4 text-sm flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{file.name} (PDF)</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">언어</Label>
            <select
              className="w-full border rounded-md px-2 py-1 text-sm"
              value={options.languages}
              onChange={(e) => setOptions((o) => ({ ...o, languages: e.target.value }))}
            >
              <option value="kor+eng">Korean + English</option>
              <option value="kor">Korean</option>
              <option value="eng">English</option>
              <option value="jpn+kor">Japanese + Korean</option>
            </select>
          </div>

          <div>
            <Label className="text-xs">페이지 세그먼트(PSM)</Label>
            <select
              className="w-full border rounded-md px-2 py-1 text-sm"
              value={options.pageSegMode}
              onChange={(e) => setOptions((o) => ({ ...o, pageSegMode: Number(e.target.value) }))}
            >
              <option value={3}>Auto</option>
              <option value={6}>Single Block</option>
              <option value={4}>Single Column</option>
              <option value={7}>Single Line</option>
            </select>
          </div>

          <div>
            <Label className="text-xs">PDF DPI</Label>
            <Input
              type="number"
              value={options.dpi}
              onChange={(e) => setOptions((o) => ({ ...o, dpi: Number(e.target.value || 150) }))}
            />
          </div>

          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2">
              <input
                id="mathMode"
                type="checkbox"
                checked={!!options.mathMode}
                onChange={(e) => setOptions((o) => ({ ...o, mathMode: e.target.checked }))}
              />
              <Label htmlFor="mathMode" className="text-xs">수식 모드</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="tableMode"
                type="checkbox"
                checked={!!options.tableMode}
                onChange={(e) => setOptions((o) => ({ ...o, tableMode: e.target.checked }))}
              />
              <Label htmlFor="tableMode" className="text-xs">표 모드</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="cleanup"
                type="checkbox"
                checked={!!options.cleanup}
                onChange={(e) => setOptions((o) => ({ ...o, cleanup: e.target.checked }))}
              />
              <Label htmlFor="cleanup" className="text-xs">후처리</Label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="text-sm">
            <div className="font-medium">언어 데이터 준비</div>
            <div className="text-muted-foreground text-xs">
              선택한 언어/PSM에 맞게 미리 내려받아 첫 실행을 빠르게 합니다.
              {warmedWith && (
                <span className="ml-1">현재: {warmedWith.languages} / PSM {warmedWith.psm}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ready ? (
              <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">준비됨</span>
            ) : null}
            <Button size="sm" variant={ready ? "secondary" : "default"} onClick={handlePrewarm} disabled={warming}>
              {warming ? "내려받는 중..." : warmedWith && !ready ? "재다운로드" : "언어 데이터 내려받기"}
            </Button>
          </div>
        </div>

        {busy && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Settings2 className="h-4 w-4 animate-spin" />
              <span>{progress?.status || "처리 중..."}</span>
              <span className="ml-auto">{Math.round((progress?.progress || 0) * 100)}%</span>
            </div>
            <Progress value={(progress?.progress || 0) * 100} />
            <p className="text-xs text-muted-foreground">
              처음 한 번은 언어 데이터(수 MB)를 내려받아 조금 오래 걸릴 수 있어요. 이후엔 빨라집니다.
            </p>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => terminate()}>
                취소
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button onClick={runOcr} disabled={!file || busy || !ready}>OCR 실행</Button>
          <Button variant="outline" onClick={() => { setFile(null); setPreviewUrl(null); }} disabled={busy}>
            초기화
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
