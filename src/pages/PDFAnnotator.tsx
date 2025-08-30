import React, { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Pen, Highlighter, Eraser, RotateCcw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';
import AnnotationCanvas, { AnnotationCanvasRef } from '@/components/AnnotationCanvas';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// react-pdf 워커 설정 - 더미 워커로 우회
const dummyWorkerCode = `
  self.onmessage = function(e) {
    console.log('Dummy worker received:', e.data);
    self.postMessage({
      messageId: e.data.messageId,
      result: null,
      error: null
    });
  };
`;

try {
  const dummyWorkerBlob = new Blob([dummyWorkerCode], { type: 'application/javascript' });
  const dummyWorkerUrl = URL.createObjectURL(dummyWorkerBlob);
  pdfjs.GlobalWorkerOptions.workerSrc = dummyWorkerUrl;
  console.log('react-pdf 더미 워커 설정 완료');
} catch (error) {
  console.warn('react-pdf 워커 설정 실패:', error);
  pdfjs.GlobalWorkerOptions.workerSrc = '';
}

const PDFAnnotator = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState([5]);
  const [brushColor, setBrushColor] = useState('#000000');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const annotationCanvasRef = useRef<AnnotationCanvasRef>(null);

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
    console.log('=== PDF 로드 성공! ===');
    console.log('총 페이지:', numPages);
    setTotalPages(numPages);
    setCurrentPage(1);
    setIsLoading(false);
    toast.success(`PDF 로드 완료! 총 ${numPages}페이지 🎉`);
  };

  // PDF 로드 오류 시 호출
  const onDocumentLoadError = (error: Error) => {
    console.error('=== PDF 로드 실패 ===');
    console.error('에러 타입:', error.constructor.name);
    console.error('에러 메시지:', error.message);
    console.error('전체 에러:', error);
    
    setIsLoading(false);
    
    // 구체적인 에러 메시지 제공
    let userMessage = 'PDF 파일을 로드할 수 없습니다.';
    if (error.message.includes('Invalid PDF')) {
      userMessage = '유효하지 않은 PDF 파일입니다.';
    } else if (error.message.includes('network')) {
      userMessage = '네트워크 오류가 발생했습니다.';
    } else if (error.message.includes('worker')) {
      userMessage = 'PDF 처리 엔진 오류가 발생했습니다.';
    } else if (error.message.includes('fetch')) {
      userMessage = '파일을 가져올 수 없습니다.';
    }
    
    toast.error(`${userMessage} (${error.message})`);
    setPdfFile(null);
  };

  // 페이지 렌더링 성공 시 호출
  const onPageLoadSuccess = (page: any) => {
    console.log(`페이지 ${currentPage} 렌더링 완료`);
    
    // PDF 크기 저장
    if (page) {
      const { width, height } = page;
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      
      setPdfDimensions({ 
        width: scaledWidth, 
        height: scaledHeight 
      });
    }
  };


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
    
    console.log('PDF 파일 설정 중...');
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
    if (annotationCanvasRef.current) {
      annotationCanvasRef.current.clear();
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
            // PDF 및 주석 캔버스
            <div className="flex justify-center">
              <div className="relative inline-block shadow-lg bg-white">
                {/* react-pdf 컴포넌트 */}
                <Document 
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  onLoadStart={() => console.log('PDF 로딩 시작...')}
                  onLoadProgress={({ loaded, total }) => {
                    console.log('로딩 진행률:', loaded, '/', total);
                    if (total) {
                      const pct = Math.round((loaded / total) * 100);
                      toast.dismiss('pdf-progress');
                      toast.loading(`PDF 로딩 중… ${pct}%`, { id: 'pdf-progress' });
                    }
                  }}
                  loading={<div className="p-8 text-center">PDF 로딩 중...</div>}
                  error={<div className="p-8 text-center text-red-500">PDF 로드 실패</div>}
                >
                  <Page 
                    pageNumber={currentPage}
                    scale={scale}
                    onLoadSuccess={onPageLoadSuccess}
                    onLoadStart={() => console.log(`페이지 ${currentPage} 로딩 시작...`)}
                    loading={<div className="p-8 text-center">페이지 로딩 중...</div>}
                    error={<div className="p-8 text-center text-red-500">페이지 로드 실패</div>}
                  />
                </Document>
                
                {/* 주석 캔버스 (오버레이) */}
                {pdfDimensions.width > 0 && pdfDimensions.height > 0 && (
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
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFAnnotator;