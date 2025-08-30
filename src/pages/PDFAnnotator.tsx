import React, { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Pen, Highlighter, Eraser, RotateCcw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';
import * as pdfjsLib from 'pdfjs-dist';

// PDF.js 워커 완전 비활성화 - 다양한 방법 시도
try {
  // 방법 1: 워커 자체를 null로 설정
  pdfjsLib.GlobalWorkerOptions.workerSrc = null as any;
} catch (e) {
  try {
    // 방법 2: 빈 문자열로 설정
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  } catch (e2) {
    // 방법 3: false로 설정
    pdfjsLib.GlobalWorkerOptions.workerSrc = false as any;
  }
}

console.log('PDF.js 워커 비활성화 시도 완료');

const PDFAnnotator = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
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
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const rafRef = useRef<number | null>(null);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'
  ];

  const highlighterColors = [
    '#FFFF00', '#FF0000', '#00FF00', '#0000FF',
    '#FFA500', '#FF00FF', '#00FFFF'
  ];

  // PDF 파일 로드
  const loadPDF = useCallback(async (file: File) => {
    setIsLoading(true);
    console.log('=== PDF 로드 시작 ===');
    console.log('파일명:', file.name);
    console.log('파일 크기:', file.size, 'bytes');
    console.log('파일 타입:', file.type);
    console.log('파일 마지막 수정:', new Date(file.lastModified));
    
    try {
      // 1. 브라우저 지원 확인
      console.log('브라우저 정보:');
      console.log('- User Agent:', navigator.userAgent);
      console.log('- PDF.js 버전:', pdfjsLib.version);
      console.log('- 워커 설정:', pdfjsLib.GlobalWorkerOptions.workerSrc);
      
      // 2. 파일 유효성 검사
      if (file.size === 0) {
        throw new Error('파일이 비어있습니다');
      }
      if (file.size > 100 * 1024 * 1024) { // 100MB 제한
        throw new Error('파일이 너무 큽니다 (100MB 제한)');
      }
      
      // 3. 파일 읽기 방법 시도
      console.log('=== 파일 읽기 시도 ===');
      let loadingTask;
      
      try {
        // 방법 1: Blob URL 사용
        console.log('방법 1: Blob URL 시도');
        const blobUrl = URL.createObjectURL(file);
        console.log('Blob URL 생성:', blobUrl);
        
        loadingTask = pdfjsLib.getDocument({
          url: blobUrl,
          verbosity: 1,
        } as any);
        console.log('Blob URL로 로딩 작업 생성 성공');
        
      } catch (blobError) {
        console.error('Blob URL 방법 실패:', blobError);
        
        // 방법 2: ArrayBuffer 사용
        console.log('방법 2: ArrayBuffer 시도');
        const arrayBuffer = await file.arrayBuffer();
        console.log('ArrayBuffer 생성 완료, 크기:', arrayBuffer.byteLength);
        
        loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          verbosity: 1,
        } as any);
        console.log('ArrayBuffer로 로딩 작업 생성 성공');
      }
      
      // 4. 로딩 진행률 모니터링
      loadingTask.onProgress = (progress: { loaded: number; total?: number }) => {
        console.log('로딩 진행률:', {
          loaded: progress.loaded,
          total: progress.total,
          percentage: progress.total ? Math.round((progress.loaded / progress.total) * 100) : '알 수 없음'
        });
        
        const pct = progress.total ? Math.round((progress.loaded / progress.total) * 100) : Math.min(99, Math.round(progress.loaded / 1000000));
        toast.dismiss('pdf-progress');
        toast.loading(`PDF 로딩 중… ${pct}%`, { id: 'pdf-progress' });
      };
      
      console.log('=== PDF 문서 로딩 시작 ===');
      const pdf = await loadingTask.promise;
      console.log('=== PDF 로드 성공! ===');
      console.log('페이지 수:', pdf.numPages);
      console.log('PDF 정보:', {
        numPages: pdf.numPages,
        fingerprints: pdf.fingerprints,
        documentInfo: pdf.documentInfo,
      });
      
      // 5. 첫 페이지 테스트 로드
      try {
        console.log('첫 페이지 테스트 로드 시도...');
        const firstPage = await pdf.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.0 });
        console.log('첫 페이지 정보:', {
          width: viewport.width,
          height: viewport.height,
          rotation: viewport.rotation,
        });
      } catch (pageError) {
        console.error('첫 페이지 로드 실패:', pageError);
        throw new Error(`첫 페이지 로드 실패: ${pageError.message}`);
      }
      
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setPdfFile(file);
      
      toast.dismiss('pdf-progress');
      toast.success(`PDF 로드 완료! 총 ${pdf.numPages}페이지 🎉`);
      
    } catch (error) {
      console.error('=== PDF 로드 실패 ===');
      console.error('에러 타입:', error.constructor.name);
      console.error('에러 메시지:', error.message);
      console.error('전체 에러:', error);
      
      if (error.stack) {
        console.error('스택 트레이스:', error.stack);
      }
      
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
      
      toast.dismiss('pdf-progress');
      toast.error(`${userMessage} (${error.message})`);
    } finally {
      setIsLoading(false);
      console.log('=== PDF 로드 과정 완료 ===');
    }
  }, []);

  // PDF 페이지 렌더링
  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDocument || !pdfCanvasRef.current) return;

    try {
      console.log(`페이지 ${pageNumber} 렌더링 시작`);
      
      // 이전 렌더/RAF 취소
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
        renderTaskRef.current = null;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      
      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';

      const render = () => {
        const renderContext = { canvasContext: context, viewport, canvas };
        const task = page.render(renderContext);
        renderTaskRef.current = task;
        task.promise.finally(() => { renderTaskRef.current = null; });
      };
      
      // 리플로우 직후 프레임에 렌더 → 끊김 감소
      rafRef.current = requestAnimationFrame(render);
      console.log(`페이지 ${pageNumber} 렌더링 완료`);
      
      // Fabric.js 캔버스 크기도 맞춤
      if (fabricCanvas && annotationCanvasRef.current) {
        annotationCanvasRef.current.width = viewport.width;
        annotationCanvasRef.current.height = viewport.height;
        annotationCanvasRef.current.style.width = viewport.width + 'px';
        annotationCanvasRef.current.style.height = viewport.height + 'px';
        
        fabricCanvas.setDimensions({ 
          width: viewport.width, 
          height: viewport.height 
        });
        fabricCanvas.renderAll();
      }
    } catch (error) {
      console.error('페이지 렌더링 실패:', error);
      toast.error('페이지를 렌더링할 수 없습니다.');
    }
  }, [pdfDocument, scale, fabricCanvas]);

  // 현재 페이지 변경시 렌더링
  useEffect(() => {
    if (pdfDocument) {
      renderPage(currentPage);
    }
  }, [pdfDocument, currentPage, scale, renderPage]);

  // Fabric.js 캔버스 초기화
  useEffect(() => {
    if (!annotationCanvasRef.current || !pdfDocument) return;

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
  }, [pdfDocument]);

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
    loadPDF(file);
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
            {pdfDocument && (
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
          
          {pdfDocument && (
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
        {pdfDocument && (
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
          {!pdfDocument ? (
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
                {/* PDF 캔버스 (배경) */}
                <canvas
                  ref={pdfCanvasRef}
                  className="block border border-gray-300"
                  style={{ maxWidth: '100%' }}
                />
                
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