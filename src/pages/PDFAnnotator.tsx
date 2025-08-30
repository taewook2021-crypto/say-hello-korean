import React, { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Pen, Highlighter, Eraser, RotateCcw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';
import AnnotationCanvas, { AnnotationCanvasRef } from '@/components/AnnotationCanvas';

const PDFAnnotator = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState([5]);
  const [brushColor, setBrushColor] = useState('#000000');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 800, height: 600 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const annotationCanvasRef = useRef<AnnotationCanvasRef>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'
  ];

  const highlighterColors = [
    '#FFFF00', '#FF0000', '#00FF00', '#0000FF',
    '#FFA500', '#FF00FF', '#00FFFF'
  ];



  // PDF 파일 업로드 처리
  const handleFileUpload = (file: File) => {
    console.log('=== 파일 업로드 시작 ===');
    console.log('파일명:', file.name);
    console.log('파일 크기:', file.size, 'bytes');
    console.log('파일 타입:', file.type);
    
    if (file.type !== 'application/pdf') {
      console.error('잘못된 파일 타입:', file.type);
      toast.error('PDF 파일만 업로드 가능합니다.');
      return;
    }
    
    setIsLoading(true);
    
    // 이전 URL 정리
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    
    // 새 Blob URL 생성
    const newUrl = URL.createObjectURL(file);
    console.log('PDF Blob URL 생성:', newUrl);
    
    setPdfFile(file);
    setPdfUrl(newUrl);
    setCurrentPage(1);
    
    // PDF 기본 정보 설정 (실제 크기는 iframe 로드 후 조정)
    setPdfDimensions({ width: 800, height: 1000 });
    
    setTimeout(() => {
      setIsLoading(false);
      toast.success('PDF 로드 완료! 🎉');
    }, 1000);
  };

  // URL 정리
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleToolChange = (tool: 'pen' | 'highlighter' | 'eraser') => {
    setCurrentTool(tool);
    
    if (tool === 'highlighter') {
      setBrushColor('#FFFF00');
    } else if (tool === 'pen') {
      setBrushColor('#000000');
    }
  };

  const clearAnnotations = () => {
    if (annotationCanvasRef.current) {
      annotationCanvasRef.current.clear();
      toast.success('필기가 지워졌습니다.');
    }
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      // iframe의 페이지 이동은 URL 해시로 처리
      if (iframeRef.current && pdfUrl) {
        iframeRef.current.src = `${pdfUrl}#page=${pageNumber}&zoom=${Math.round(scale * 100)}`;
      }
    }
  };

  const zoomIn = () => {
    const newScale = Math.min(scale + 0.25, 3);
    setScale(newScale);
    if (iframeRef.current && pdfUrl) {
      iframeRef.current.src = `${pdfUrl}#page=${currentPage}&zoom=${Math.round(newScale * 100)}`;
    }
  };

  const zoomOut = () => {
    const newScale = Math.max(scale - 0.25, 0.5);
    setScale(newScale);
    if (iframeRef.current && pdfUrl) {
      iframeRef.current.src = `${pdfUrl}#page=${currentPage}&zoom=${Math.round(newScale * 100)}`;
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
            {pdfFile && totalPages > 0 && (
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
                  disabled={!pdfFile}
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
            // PDF 뷰어 및 주석 캔버스
            <div className="flex justify-center">
              <div className="relative inline-block shadow-lg bg-white">
                {/* 브라우저 내장 PDF 뷰어 */}
                <iframe
                  ref={iframeRef}
                  src={`${pdfUrl}#page=${currentPage}&zoom=${Math.round(scale * 100)}`}
                  width={pdfDimensions.width}
                  height={pdfDimensions.height}
                  className="border border-gray-300"
                  title="PDF Viewer"
                  onLoad={() => {
                    console.log('PDF iframe 로드 완료');
                    // 기본 페이지 수 설정 (실제로는 PDF에서 가져올 수 없지만 사용자가 입력 가능)
                    if (totalPages === 0) {
                      setTotalPages(10); // 기본값, 사용자가 수정 가능
                    }
                  }}
                />
                
                {/* 주석 캔버스 (오버레이) */}
                <AnnotationCanvas
                  ref={annotationCanvasRef}
                  width={pdfDimensions.width}
                  height={pdfDimensions.height}
                  currentTool={currentTool}
                  brushSize={brushSize[0]}
                  brushColor={brushColor}
                  onPathCreated={() => {
                    console.log('필기 완료');
                    toast.success('필기 완료!');
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