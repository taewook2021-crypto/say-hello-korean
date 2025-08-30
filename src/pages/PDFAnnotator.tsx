import React, { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Pen, Highlighter, Eraser, RotateCcw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// react-pdf 워커 설정 - CDN 사용
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
console.log('react-pdf 워커 설정 완료');

const PDFAnnotator = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState([5]);
  const [brushColor, setBrushColor] = useState('#000000');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'
  ];

  const highlighterColors = [
    '#FFFF00', '#FF0000', '#00FF00', '#0000FF',
    '#FFA500', '#FF00FF', '#00FFFF'
  ];

  // PDF 파일 로드 성공 시 호출
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF 로드 성공! 총 페이지:', numPages);
    setTotalPages(numPages);
    setCurrentPage(1);
    toast.success(`PDF 로드 완료! 총 ${numPages}페이지 🎉`);
  };

  // PDF 로드 오류 시 호출
  const onDocumentLoadError = (error: Error) => {
    console.error('PDF 로드 실패:', error);
    toast.error('PDF 파일을 로드할 수 없습니다. 다른 파일을 시도해보세요.');
    setPdfFile(null);
  };

  // 페이지 렌더링 성공 시 호출
  const onPageLoadSuccess = (page: any) => {
    console.log(`페이지 ${currentPage} 렌더링 완료`);
    
    // Fabric.js 캔버스 크기 맞춤
    if (fabricCanvas && annotationCanvasRef.current) {
      const { width, height } = page;
      annotationCanvasRef.current.width = width * scale;
      annotationCanvasRef.current.height = height * scale;
      annotationCanvasRef.current.style.width = width * scale + 'px';
      annotationCanvasRef.current.style.height = height * scale + 'px';
      
      fabricCanvas.setDimensions({ 
        width: width * scale, 
        height: height * scale 
      });
      fabricCanvas.renderAll();
    }
  };

  // Fabric.js 캔버스 초기화
  useEffect(() => {
    if (!annotationCanvasRef.current || !pdfFile) return;

    console.log('Fabric 캔버스 초기화');
    const canvas = new FabricCanvas(annotationCanvasRef.current, {
      isDrawingMode: true,
      selection: false,
      backgroundColor: 'transparent'
    });

    // 브러시 설정
    const brush = new PencilBrush(canvas);
    brush.width = brushSize[0];
    brush.color = brushColor;
    canvas.freeDrawingBrush = brush;

    // 터치 이벤트 설정
    const canvasElement = canvas.getElement();
    canvasElement.style.touchAction = 'none';

    canvas.on('path:created', () => {
      console.log('필기 완료');
      toast.success('필기 완료!');
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [pdfFile]);

  // 브러시 설정 업데이트
  useEffect(() => {
    if (!fabricCanvas) return;

    const brush = fabricCanvas.freeDrawingBrush;
    if (brush) {
      const finalWidth = currentTool === 'highlighter' ? brushSize[0] * 2 : brushSize[0];
      const finalColor = brushColor;
      
      brush.width = finalWidth;
      brush.color = finalColor;
      
      // 하이라이터 모드: multiply 블렌딩으로 자연스러운 겹침
      // @ts-ignore fabric 타입엔 없지만 런타임 반영됨
      fabricCanvas.contextTop.globalCompositeOperation = currentTool === 'highlighter' ? 'multiply' : 'source-over';
    }

    fabricCanvas.isDrawingMode = currentTool !== 'eraser';

    // 지우개 모드
    if (currentTool === 'eraser') {
      fabricCanvas.off('mouse:down');
      fabricCanvas.on('mouse:down', (e) => {
        if (e.target) {
          fabricCanvas.remove(e.target);
          fabricCanvas.renderAll();
          console.log('객체 삭제됨');
        }
      });
    } else {
      fabricCanvas.off('mouse:down');
    }
  }, [currentTool, brushSize, brushColor, fabricCanvas]);

  const handleFileUpload = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('PDF 파일만 업로드 가능합니다.');
      return;
    }
    setPdfFile(file);
    setIsLoading(true);
  };

  const handleToolChange = (tool: 'pen' | 'highlighter' | 'eraser') => {
    setCurrentTool(tool);
    
    if (tool === 'highlighter') {
      setBrushColor('#FFFF00');
    } else if (tool === 'pen') {
      setBrushColor('#000000');
    }
  };

  const clearAnnotations = () => {
    if (fabricCanvas) {
      fabricCanvas.clear();
      fabricCanvas.renderAll();
      toast.success('필기가 지워졌습니다.');
    }
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
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
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 상단 툴바 */}
      <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">PDF 필기 📝</h1>
              {pdfFile && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                <span className="text-sm min-w-0 px-2 py-1 bg-muted rounded">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
            
            {pdfFile && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm min-w-0 px-2 py-1 bg-muted rounded">
                {Math.round(scale * 100)}%
              </span>
              <Button variant="outline" size="sm" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 툴바 */}
        {pdfFile && (
          <div className="w-80 border-r border-border p-6 space-y-6 bg-background overflow-y-auto">
            <h2 className="text-xl font-bold">필기 도구</h2>
            
            {/* 도구 선택 */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">도구</h3>
              <div className="space-y-3">
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
              <h3 className="font-medium mb-4">브러시 크기: {brushSize[0]}px</h3>
              <Slider
                value={brushSize}
                onValueChange={setBrushSize}
                max={50}
                min={1}
                step={1}
              />
            </Card>

            {/* 색상 선택 */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">
                {currentTool === 'highlighter' ? '형광펜 색상' : '펜 색상'}
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {(currentTool === 'highlighter' ? highlighterColors : colors).map((color) => (
                  <button
                    key={color}
                    className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
                      brushColor === color
                        ? 'border-foreground scale-110 shadow-lg'
                        : 'border-muted hover:border-foreground/50'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setBrushColor(color)}
                    title={`색상: ${color}`}
                  />
                ))}
              </div>
            </Card>

            {/* 전체 지우기 */}
            <Card className="p-4">
              <Button
                onClick={clearAnnotations}
                className="w-full"
                variant="outline"
                disabled={!fabricCanvas}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                필기 지우기
              </Button>
            </Card>
          </div>
        )}

        {/* PDF 및 주석 영역 */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          {!pdfFile ? (
            // PDF 업로드 대기 화면
            <div
              className={`h-full flex flex-col items-center justify-center border-2 border-dashed transition-colors ${
                isDragging ? 'border-primary bg-primary/10' : 'border-muted'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-center max-w-md">
                <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">PDF 파일을 업로드하세요</h3>
                <p className="text-muted-foreground mb-4">
                  파일을 드래그하여 놓거나 아래 버튼을 클릭하세요
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="lg"
                  disabled={isLoading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isLoading ? '로딩 중...' : '파일 선택'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            // PDF 및 주석 캔버스
            <div className="flex justify-center">
              <div className="relative inline-block shadow-lg bg-white">
                {/* react-pdf 컴포넌트 */}
                <Document 
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={<div className="p-8 text-center">PDF 로딩 중...</div>}
                >
                  <Page 
                    pageNumber={currentPage}
                    scale={scale}
                    onLoadSuccess={onPageLoadSuccess}
                    loading={<div className="p-8 text-center">페이지 로딩 중...</div>}
                  />
                </Document>
                
                {/* 주석 캔버스 (오버레이) */}
                <canvas
                  ref={annotationCanvasRef}
                  className="absolute top-0 left-0"
                  style={{
                    cursor: currentTool === 'pen' ? 'crosshair' : 
                             currentTool === 'highlighter' ? 'cell' : 'grab'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFAnnotator;