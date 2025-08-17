import React, { useState, useRef, useEffect } from "react";
import { Upload, Pen, Highlighter, Eraser, Save, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';

const PDFAnnotator = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState([3]);
  const [brushColor, setBrushColor] = useState('#000000');
  const [isDragging, setIsDragging] = useState(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'
  ];

  const highlighterColors = [
    '#FFFF0080', '#FF000080', '#00FF0080', '#0000FF80',
    '#FFA50080', '#FF00FF80', '#00FFFF80'
  ];

  // 캔버스 크기 조정 함수
  const resizeCanvas = () => {
    if (!containerRef.current || !canvasRef.current || !fabricCanvas || !iframeRef.current) return;
    
    const container = containerRef.current;
    const iframe = iframeRef.current;
    
    // iframe의 실제 크기 가져오기
    const iframeRect = iframe.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    console.log('Container 크기:', containerRect.width, 'x', containerRect.height);
    console.log('Iframe 크기:', iframeRect.width, 'x', iframeRect.height);
    
    // Canvas를 iframe과 정확히 같은 크기로 설정
    const canvas = canvasRef.current;
    canvas.width = iframeRect.width;
    canvas.height = iframeRect.height;
    canvas.style.width = iframeRect.width + 'px';
    canvas.style.height = iframeRect.height + 'px';
    
    // Fabric Canvas 크기 설정
    fabricCanvas.setDimensions({
      width: iframeRect.width,
      height: iframeRect.height
    });
    
    // Canvas 위치를 iframe과 정확히 맞춤
    canvas.style.left = '0px';
    canvas.style.top = '0px';
    
    fabricCanvas.renderAll();
    console.log('Canvas 크기 조정 완료:', iframeRect.width, 'x', iframeRect.height);
  };

  // PDF 파일 로드
  const handleFileUpload = (file: File) => {
    console.log('PDF 파일 선택:', file.name, file.type, file.size);
    
    if (file.type !== 'application/pdf') {
      toast.error('PDF 파일만 업로드 가능합니다.');
      return;
    }

    // 기존 URL 정리
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    
    // 새 PDF blob URL 생성
    const url = URL.createObjectURL(file);
    setPdfFile(file);
    setPdfUrl(url);
    
    console.log('PDF blob URL 생성:', url);
    toast.success('PDF 파일이 로드되었습니다.');
  };

  // Fabric.js 캔버스 초기화
  useEffect(() => {
    if (!canvasRef.current || !pdfUrl) return;

    console.log('Fabric.js 캔버스 초기화 시작');

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      isDrawingMode: true,
      selection: false,
      backgroundColor: 'transparent',
      // 터치 이벤트 지원 개선
      enableRetinaScaling: false,
      imageSmoothingEnabled: false
    });

    // 터치 이벤트 활성화
    canvas.allowTouchScrolling = false;
    
    // 브러시 초기 설정
    setupBrush(canvas);
    
    // 그리기 이벤트 리스너 추가 (디버깅용)
    canvas.on('path:created', (e) => {
      console.log('그리기 완료:', e.path);
      console.log('현재 캔버스 객체 수:', canvas.getObjects().length);
    });
    
    canvas.on('mouse:down', (e) => {
      console.log('마우스/터치 다운:', e.pointer);
    });
    
    canvas.on('mouse:move', (e) => {
      if (canvas.isDrawingMode) {
        console.log('그리는 중:', e.pointer);
      }
    });
    
    setFabricCanvas(canvas);
    setIsCanvasReady(true);

    console.log('Fabric.js 캔버스 초기화 완료');

    // 창 크기 변경 이벤트 리스너
    const handleResize = () => {
      console.log('창 크기 변경 감지');
      setTimeout(resizeCanvas, 200);
    };
    
    window.addEventListener('resize', handleResize);
    
    // 초기 크기 조정 (PDF 로드 대기)
    const timer = setTimeout(() => {
      console.log('초기 캔버스 크기 조정 실행');
      resizeCanvas();
    }, 1500);

    return () => {
      console.log('Fabric.js 캔버스 정리');
      canvas.dispose();
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [pdfUrl]);

  const setupBrush = (canvas: FabricCanvas) => {
    const brush = new PencilBrush(canvas);
    brush.width = brushSize[0];
    brush.color = currentTool === 'highlighter' ? brushColor + '80' : brushColor;
    
    if (currentTool === 'highlighter') {
      brush.width = brushSize[0] * 2;
    }
    
    // 더 부드러운 그리기를 위한 설정
    brush.decimate = 0.4;
    brush.drawStraightLine = false;
    
    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = currentTool !== 'eraser';
    
    console.log('브러시 설정 완료:', { 
      tool: currentTool, 
      size: brush.width, 
      color: brush.color,
      isDrawingMode: canvas.isDrawingMode 
    });
  };

  const handleToolChange = (tool: 'pen' | 'highlighter' | 'eraser') => {
    console.log('도구 변경:', tool);
    setCurrentTool(tool);
    
    if (tool === 'highlighter') {
      setBrushColor(highlighterColors[0].slice(0, -2));
    } else if (tool === 'pen') {
      setBrushColor('#000000');
    }
    
    if (fabricCanvas) {
      setupBrush(fabricCanvas);
    }
  };

  const handleColorChange = (color: string) => {
    console.log('색상 변경:', color);
    setBrushColor(color);
    
    if (fabricCanvas) {
      setupBrush(fabricCanvas);
    }
  };

  const handleBrushSizeChange = (size: number[]) => {
    console.log('브러시 크기 변경:', size[0]);
    setBrushSize(size);
    
    if (fabricCanvas) {
      setupBrush(fabricCanvas);
    }
  };

  const clearCanvas = () => {
    if (fabricCanvas) {
      fabricCanvas.clear();
      console.log('캔버스 지움');
      toast.success('필기가 지워졌습니다.');
    }
  };

  const saveAnnotations = () => {
    if (!fabricCanvas) {
      toast.error('저장할 필기가 없습니다.');
      return;
    }

    try {
      const annotationData = JSON.stringify(fabricCanvas.toJSON());
      const blob = new Blob([annotationData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pdfFile?.name?.replace('.pdf', '') || 'pdf'}_annotations.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log('필기 저장 완료');
      toast.success('필기가 저장되었습니다.');
    } catch (error) {
      console.error('필기 저장 실패:', error);
      toast.error('필기 저장에 실패했습니다.');
    }
  };

  const loadAnnotations = async (file: File) => {
    if (!fabricCanvas) {
      toast.error('먼저 PDF를 로드해주세요.');
      return;
    }

    try {
      console.log('필기 파일 로드 시작:', file.name);
      const text = await file.text();
      const data = JSON.parse(text);
      
      fabricCanvas.loadFromJSON(data, () => {
        fabricCanvas.renderAll();
        console.log('필기 로드 완료');
        toast.success('필기가 불러와졌습니다.');
      });
    } catch (error) {
      console.error('필기 로드 실패:', error);
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
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // 컴포넌트 언마운트 시 URL 정리
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        console.log('PDF URL 정리:', pdfUrl);
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <div className="flex h-screen bg-background">
      {/* 툴바 */}
      <div className="w-64 border-r border-border p-4 space-y-4 overflow-y-auto">
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
              const file = e.target.files?.[0];
              if (file) {
                handleFileUpload(file);
              }
            }}
            className="hidden"
          />
          {pdfFile && (
            <p className="text-xs text-muted-foreground mt-2 truncate" title={pdfFile.name}>
              📄 {pdfFile.name}
            </p>
          )}
        </Card>

        {/* 도구 선택 */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">도구</h3>
          <div className="space-y-2">
            <Button
              variant={currentTool === 'pen' ? 'default' : 'outline'}
              onClick={() => handleToolChange('pen')}
              className="w-full justify-start"
              disabled={!isCanvasReady}
            >
              <Pen className="w-4 h-4 mr-2" />
              펜
            </Button>
            <Button
              variant={currentTool === 'highlighter' ? 'default' : 'outline'}
              onClick={() => handleToolChange('highlighter')}
              className="w-full justify-start"
              disabled={!isCanvasReady}
            >
              <Highlighter className="w-4 h-4 mr-2" />
              형광펜
            </Button>
            <Button
              variant={currentTool === 'eraser' ? 'default' : 'outline'}
              onClick={() => handleToolChange('eraser')}
              className="w-full justify-start"
              disabled={!isCanvasReady}
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
            onValueChange={handleBrushSizeChange}
            max={20}
            min={1}
            step={1}
            disabled={!isCanvasReady}
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
                className={`w-8 h-8 rounded-full border-2 transition-colors hover:scale-110 ${
                  brushColor === (currentTool === 'highlighter' ? color.slice(0, -2) : color)
                    ? 'border-foreground scale-110'
                    : 'border-muted hover:border-foreground/50'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorChange(
                  currentTool === 'highlighter' ? color.slice(0, -2) : color
                )}
                disabled={!isCanvasReady}
                title={`색상: ${color}`}
              />
            ))}
          </div>
        </Card>

        {/* 필기 관리 */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">필기 관리</h3>
          <div className="space-y-2">
            <Button
              onClick={clearCanvas}
              className="w-full justify-start"
              variant="outline"
              disabled={!isCanvasReady}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              전체 지우기
            </Button>
            <Button
              onClick={saveAnnotations}
              className="w-full justify-start"
              variant="outline"
              disabled={!isCanvasReady}
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
              disabled={!isCanvasReady}
            >
              <Download className="w-4 h-4 mr-2" />
              필기 불러오기
            </Button>
          </div>
        </Card>

        {/* 상태 표시 */}
        <Card className="p-3">
          <div className="text-xs space-y-1">
            <div className={`flex items-center gap-2 ${pdfUrl ? 'text-green-600' : 'text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${pdfUrl ? 'bg-green-500' : 'bg-muted'}`}></div>
              PDF: {pdfUrl ? '로드됨' : '없음'}
            </div>
            <div className={`flex items-center gap-2 ${isCanvasReady ? 'text-green-600' : 'text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${isCanvasReady ? 'bg-green-500' : 'bg-muted'}`}></div>
              필기: {isCanvasReady ? '준비됨' : '대기중'}
            </div>
          </div>
        </Card>
      </div>

      {/* PDF 뷰어 및 필기 영역 */}
      <div className="flex-1 overflow-hidden">
        {!pdfUrl ? (
          <div
            className={`h-full flex items-center justify-center border-2 border-dashed transition-colors ${
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
                파일을 드래그하여 놓거나 업로드 버튼을 클릭하세요
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="lg"
              >
                <Upload className="w-4 h-4 mr-2" />
                파일 선택
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                브라우저 기본 PDF 뷰어를 사용합니다
              </p>
            </div>
          </div>
        ) : (
          <div ref={containerRef} className="relative w-full h-full bg-gray-50">
            {/* 브라우저 기본 PDF 뷰어 */}
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              className="w-full h-full border-0 block"
              title="PDF 뷰어"
              onLoad={() => {
                console.log('PDF iframe 로드 완료');
                setTimeout(() => {
                  resizeCanvas();
                }, 800);
                setTimeout(() => {
                  resizeCanvas();
                }, 2000);
              }}
              onError={(e) => {
                console.error('PDF iframe 로드 실패:', e);
                toast.error('PDF를 표시할 수 없습니다. 브라우저에서 PDF 뷰어를 지원하지 않을 수 있습니다.');
              }}
            />
            
            {/* 투명 필기 캔버스 오버레이 */}
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 z-10"
              style={{
                pointerEvents: 'auto',
                touchAction: 'none',
                cursor: currentTool === 'pen' ? 'crosshair' : currentTool === 'highlighter' ? 'cell' : 'grab',
                backgroundColor: 'transparent'
              }}
              onMouseDown={(e) => {
                console.log('캔버스 마우스 다운:', e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                console.log('캔버스 터치 시작:', e.touches[0]?.clientX, e.touches[0]?.clientY);
                e.preventDefault(); // 스크롤 방지
              }}
            />
            
            {/* 로딩 상태 표시 */}
            {!isCanvasReady && pdfUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">필기 도구 준비 중...</p>
                </div>
              </div>
            )}

            {/* 도구 상태 표시 */}
            {isCanvasReady && (
              <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-lg z-15 border">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brushColor }}></div>
                  <span className="font-medium">
                    {currentTool === 'pen' ? '펜' : currentTool === 'highlighter' ? '형광펜' : '지우개'}
                  </span>
                  <span className="text-muted-foreground">
                    {brushSize[0]}px
                  </span>
                </div>
              </div>
            )}

            {/* 디버깅 정보 */}
            {isCanvasReady && fabricCanvas && (
              <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-lg z-15 border text-xs">
                <div>그린 객체 수: {fabricCanvas.getObjects().length}</div>
                <div>그리기 모드: {fabricCanvas.isDrawingMode ? '활성' : '비활성'}</div>
                <div>캔버스 크기: {fabricCanvas.width} x {fabricCanvas.height}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFAnnotator;