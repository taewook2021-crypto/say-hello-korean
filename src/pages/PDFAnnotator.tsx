import { useState, useRef, useEffect } from "react";
import { Upload, Pen, Highlighter, Eraser, Save, Download, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import * as pdfjsLib from 'pdfjs-dist';
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';

// PDF.js worker 설정 - 로컬 node_modules에서 직접 로드
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/node_modules/pdfjs-dist/build/pdf.worker.min.js`;
} catch {
  // 대안으로 jsDelivr CDN 사용
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
}

interface PDFPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  fabricCanvas: FabricCanvas;
}

const PDFAnnotator = () => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState([2]);
  const [brushColor, setBrushColor] = useState('#000000');
  const [zoom, setZoom] = useState([1]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'
  ];

  const highlighterColors = [
    '#FFFF0080', '#FF000080', '#00FF0080', '#0000FF80',
    '#FFA50080', '#FF00FF80', '#00FFFF80'
  ];

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 Fabric 캔버스들 정리
      pages.forEach(page => {
        page.fabricCanvas.dispose();
      });
    };
  }, [pages]);

  const handleFileUpload = async (file: File) => {
    console.log('파일 업로드 시도:', file.name, file.type, file.size);
    
    if (file.type !== 'application/pdf') {
      console.error('PDF가 아닌 파일:', file.type);
      toast.error('PDF 파일만 업로드 가능합니다.');
      return;
    }

    try {
      console.log('PDF 로딩 시작...');
      const arrayBuffer = await file.arrayBuffer();
      console.log('ArrayBuffer 크기:', arrayBuffer.byteLength);
      
      // PDF.js 로딩 옵션 추가
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });
      
      const pdf = await loadingTask.promise;
      console.log('PDF 로드 성공, 페이지 수:', pdf.numPages);
      
      setPdfDoc(pdf);
      
      // 기존 페이지들 정리
      pages.forEach(page => {
        page.fabricCanvas.dispose();
      });
      
      await renderAllPages(pdf);
      toast.success(`PDF 로드 완료 (${pdf.numPages} 페이지)`);
    } catch (error) {
      console.error('PDF 로드 실패:', error);
      toast.error(`PDF 파일을 로드할 수 없습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  const renderAllPages = async (pdf: pdfjsLib.PDFDocumentProxy) => {
    const newPages: PDFPage[] = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: zoom[0] });
      
      // PDF 렌더링용 캔버스
      const pdfCanvas = document.createElement('canvas');
      const context = pdfCanvas.getContext('2d')!;
      pdfCanvas.height = viewport.height;
      pdfCanvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: pdfCanvas
      }).promise;
      
      // Fabric.js 캔버스 (필기용)
      const fabricCanvasElement = document.createElement('canvas');
      fabricCanvasElement.width = viewport.width;
      fabricCanvasElement.height = viewport.height;
      
      const fabricCanvas = new FabricCanvas(fabricCanvasElement, {
        width: viewport.width,
        height: viewport.height,
        isDrawingMode: true,
        selection: false
      });
      
      // 브러시 설정
      setupBrush(fabricCanvas);
      
      newPages.push({
        pageNumber: pageNum,
        canvas: pdfCanvas,
        fabricCanvas
      });
    }
    
    setPages(newPages);
  };

  const setupBrush = (canvas: FabricCanvas) => {
    const brush = new PencilBrush(canvas);
    brush.width = brushSize[0];
    brush.color = currentTool === 'highlighter' ? brushColor + '80' : brushColor;
    
    if (currentTool === 'highlighter') {
      brush.width = brushSize[0] * 3;
    }
    
    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = currentTool !== 'eraser';
  };

  useEffect(() => {
    pages.forEach(page => {
      setupBrush(page.fabricCanvas);
    });
  }, [currentTool, brushSize, brushColor, pages]);

  const handleToolChange = (tool: 'pen' | 'highlighter' | 'eraser') => {
    setCurrentTool(tool);
    
    if (tool === 'highlighter') {
      setBrushColor(highlighterColors[0].slice(0, -2)); // 투명도 제거
    } else if (tool === 'pen') {
      setBrushColor('#000000');
    }
  };

  const handleColorChange = (color: string) => {
    setBrushColor(color);
  };

  const clearPage = (pageIndex: number) => {
    if (pages[pageIndex]) {
      pages[pageIndex].fabricCanvas.clear();
      toast.success(`${pageIndex + 1}페이지 필기가 지워졌습니다.`);
    }
  };

  const saveAnnotations = () => {
    const annotations = pages.map(page => ({
      pageNumber: page.pageNumber,
      data: JSON.stringify(page.fabricCanvas.toJSON())
    }));
    
    const blob = new Blob([JSON.stringify(annotations)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('필기가 저장되었습니다.');
  };

  const loadAnnotations = async (file: File) => {
    try {
      const text = await file.text();
      const annotations = JSON.parse(text);
      
      annotations.forEach((annotation: any) => {
        const pageIndex = annotation.pageNumber - 1;
        if (pages[pageIndex]) {
          pages[pageIndex].fabricCanvas.loadFromJSON(annotation.data, () => {
            pages[pageIndex].fabricCanvas.renderAll();
          });
        }
      });
      
      toast.success('필기가 불러와졌습니다.');
    } catch (error) {
      toast.error('필기 파일을 불러올 수 없습니다.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    console.log('드롭된 파일들:', files);
    if (files.length > 0) {
      console.log('첫 번째 파일 처리:', files[0].name, files[0].type);
      handleFileUpload(files[0]);
    }
  };

  const handleZoomChange = async (newZoom: number[]) => {
    setZoom(newZoom);
    if (pdfDoc) {
      await renderAllPages(pdfDoc);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* 툴바 */}
      <div className="w-64 border-r border-border p-4 space-y-4">
        <h2 className="text-lg font-semibold">PDF 필기 도구</h2>
        
        {/* 파일 업로드 */}
        <Card className="p-4">
          <Button
            onClick={() => {
              console.log('파일 업로드 버튼 클릭');
              fileInputRef.current?.click();
            }}
            className="w-full mb-2"
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            PDF 업로드
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              console.log('파일 선택 이벤트:', e.target.files);
              const file = e.target.files?.[0];
              if (file) {
                console.log('선택된 파일:', file.name, file.type);
                handleFileUpload(file);
              } else {
                console.log('파일이 선택되지 않음');
              }
            }}
            className="hidden"
          />
        </Card>

        {/* 도구 선택 */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">도구</h3>
          <div className="space-y-2">
            <Button
              variant={currentTool === 'pen' ? 'default' : 'outline'}
              onClick={() => handleToolChange('pen')}
              className="w-full justify-start"
            >
              <Pen className="w-4 h-4 mr-2" />
              펜
            </Button>
            <Button
              variant={currentTool === 'highlighter' ? 'default' : 'outline'}
              onClick={() => handleToolChange('highlighter')}
              className="w-full justify-start"
            >
              <Highlighter className="w-4 h-4 mr-2" />
              형광펜
            </Button>
            <Button
              variant={currentTool === 'eraser' ? 'default' : 'outline'}
              onClick={() => handleToolChange('eraser')}
              className="w-full justify-start"
            >
              <Eraser className="w-4 h-4 mr-2" />
              지우개
            </Button>
          </div>
        </Card>

        {/* 브러시 크기 */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">브러시 크기: {brushSize[0]}px</h3>
          <Slider
            value={brushSize}
            onValueChange={setBrushSize}
            max={20}
            min={1}
            step={1}
          />
        </Card>

        {/* 색상 선택 */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">
            {currentTool === 'highlighter' ? '형광펜 색상' : '펜 색상'}
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {(currentTool === 'highlighter' ? highlighterColors : colors).map((color) => (
              <button
                key={color}
                className={`w-8 h-8 rounded-full border-2 ${
                  brushColor === (currentTool === 'highlighter' ? color.slice(0, -2) : color)
                    ? 'border-foreground'
                    : 'border-muted'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorChange(
                  currentTool === 'highlighter' ? color.slice(0, -2) : color
                )}
              />
            ))}
          </div>
        </Card>

        {/* 줌 조절 */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">줌: {Math.round(zoom[0] * 100)}%</h3>
          <div className="flex items-center space-x-2 mb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleZoomChange([Math.max(0.5, zoom[0] - 0.1)])}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleZoomChange([Math.min(3, zoom[0] + 0.1)])}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          <Slider
            value={zoom}
            onValueChange={handleZoomChange}
            max={3}
            min={0.5}
            step={0.1}
          />
        </Card>

        {/* 저장/불러오기 */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">필기 관리</h3>
          <div className="space-y-2">
            <Button
              onClick={saveAnnotations}
              className="w-full justify-start"
              variant="outline"
              disabled={!pdfDoc}
            >
              <Save className="w-4 h-4 mr-2" />
              필기 저장
            </Button>
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) loadAnnotations(file);
                };
                input.click();
              }}
              className="w-full justify-start"
              variant="outline"
              disabled={!pdfDoc}
            >
              <Download className="w-4 h-4 mr-2" />
              필기 불러오기
            </Button>
          </div>
        </Card>
      </div>

      {/* PDF 뷰어 영역 */}
      <div className="flex-1 overflow-auto">
        {!pdfDoc ? (
          <div
            className={`h-full flex items-center justify-center border-2 border-dashed transition-colors ${
              isDragging ? 'border-primary bg-primary/10' : 'border-muted'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">PDF 파일을 드래그하거나</p>
              <p className="text-muted-foreground mb-4">업로드 버튼을 클릭하세요</p>
              <Button
                onClick={() => {
                  console.log('하단 파일 선택 버튼 클릭');
                  fileInputRef.current?.click();
                }}
                variant="outline"
              >
                파일 선택
              </Button>
            </div>
          </div>
        ) : (
          <div ref={containerRef} className="p-8 space-y-8">
            {pages.map((page, index) => (
              <div key={page.pageNumber} className="relative mx-auto" style={{ width: 'fit-content' }}>
                <div className="relative shadow-lg">
                  {/* PDF 배경 */}
                  <div
                    style={{
                      backgroundImage: `url(${page.canvas.toDataURL()})`,
                      width: page.canvas.width,
                      height: page.canvas.height,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                  
                  {/* Fabric.js 캔버스 오버레이 */}
                  <div
                    className="absolute top-0 left-0"
                    ref={(el) => {
                      if (el && page.fabricCanvas && !el.contains(page.fabricCanvas.getElement())) {
                        el.appendChild(page.fabricCanvas.getElement());
                      }
                    }}
                  />
                </div>
                
                {/* 페이지 번호 및 클리어 버튼 */}
                <div className="absolute top-2 right-2 flex items-center space-x-2">
                  <span className="bg-background/80 px-2 py-1 rounded text-sm">
                    {page.pageNumber}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => clearPage(index)}
                    className="bg-background/80"
                  >
                    지우기
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFAnnotator;