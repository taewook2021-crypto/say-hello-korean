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
    if (!containerRef.current || !canvasRef.current || !fabricCanvas) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // 캔버스 크기를 컨테이너에 맞게 조정
    canvasRef.current.width = rect.width;
    canvasRef.current.height = rect.height;
    
    fabricCanvas.setDimensions({
      width: rect.width,
      height: rect.height
    });
    
    fabricCanvas.renderAll();
  };

  // PDF 파일 로드
  const handleFileUpload = (file: File) => {
    console.log('PDF 파일 선택:', file.name, file.type);
    
    if (file.type !== 'application/pdf') {
      toast.error('PDF 파일만 업로드 가능합니다.');
      return;
    }

    // 기존 URL 정리
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    
    // 새 PDF URL 생성
    const url = URL.createObjectURL(file);
    setPdfFile(file);
    setPdfUrl(url);
    
    toast.success('PDF 파일이 로드되었습니다.');
  };

  // Fabric.js 캔버스 초기화
  useEffect(() => {
    if (!canvasRef.current || !pdfUrl) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      isDrawingMode: true,
      selection: false,
      backgroundColor: 'transparent'
    });

    // 브러시 초기 설정
    setupBrush(canvas);
    
    setFabricCanvas(canvas);
    setIsCanvasReady(true);

    // 창 크기 변경 이벤트 리스너
    const handleResize = () => {
      setTimeout(resizeCanvas, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    // 초기 크기 조정
    setTimeout(resizeCanvas, 500);

    return () => {
      canvas.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [pdfUrl]);

  // 캔버스 크기 조정 (PDF 로드 후)
  useEffect(() => {
    if (fabricCanvas && pdfUrl) {
      const timer = setTimeout(() => {
        resizeCanvas();
      }, 1000); // PDF가 로드될 시간을 기다림

      return () => clearTimeout(timer);
    }
  }, [fabricCanvas, pdfUrl]);

  const setupBrush = (canvas: FabricCanvas) => {
    const brush = new PencilBrush(canvas);
    brush.width = brushSize[0];
    brush.color = currentTool === 'highlighter' ? brushColor + '80' : brushColor;
    
    if (currentTool === 'highlighter') {
      brush.width = brushSize[0] * 2;
    }
    
    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = currentTool !== 'eraser';
  };

  const handleToolChange = (tool: 'pen' | 'highlighter' | 'eraser') => {
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
    setBrushColor(color);
    
    if (fabricCanvas) {
      setupBrush(fabricCanvas);
    }
  };

  const handleBrushSizeChange = (size: number[]) => {
    setBrushSize(size);
    
    if (fabricCanvas) {
      setupBrush(fabricCanvas);
    }
  };

  const clearCanvas = () => {
    if (fabricCanvas) {
      fabricCanvas.clear();
      toast.success('필기가 지워졌습니다.');
    }
  };

  const saveAnnotations = () => {
    if (!fabricCanvas) {
      toast.error('저장할 필기가 없습니다.');
      return;
    }

    const annotationData = JSON.stringify(fabricCanvas.toJSON());
    const blob = new Blob([annotationData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pdfFile?.name || 'pdf'}_annotations.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('필기가 저장되었습니다.');
  };

  const loadAnnotations = async (file: File) => {
    if (!fabricCanvas) {
      toast.error('먼저 PDF를 로드해주세요.');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      fabricCanvas.loadFromJSON(data, () => {
        fabricCanvas.renderAll();
        toast.success('필기가 불러와졌습니다.');
      });
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
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // 컴포넌트 언마운트 시 URL 정리
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* 툴바 */}
      <div className="w-64 border-r border-border p-4 space-y-4 overflow-y-auto">
        <h2 className="text-lg font-semibold">PDF 필기 도구</h2>
        
        {/* 파일 업로드 */}
        <Card className="p-4">
          <Button
            onClick={() => fileInputRef.current?.click()}
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
            <p className="text-xs text-muted-foreground mt-2 truncate">
              {pdfFile.name}
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
                className={`w-8 h-8 rounded-full border-2 transition-colors ${
                  brushColor === (currentTool === 'highlighter' ? color.slice(0, -2) : color)
                    ? 'border-foreground'
                    : 'border-muted'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorChange(
                  currentTool === 'highlighter' ? color.slice(0, -2) : color
                )}
                disabled={!isCanvasReady}
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
            <div className="text-center">
              <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">PDF 파일을 드래그하거나</p>
              <p className="text-muted-foreground mb-4">업로드 버튼을 클릭하세요</p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                파일 선택
              </Button>
            </div>
          </div>
        ) : (
          <div ref={containerRef} className="relative w-full h-full">
            {/* 브라우저 기본 PDF 뷰어 */}
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF 뷰어"
              onLoad={() => {
                console.log('PDF iframe 로드 완료');
                setTimeout(resizeCanvas, 100);
              }}
            />
            
            {/* 투명 필기 캔버스 오버레이 */}
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 pointer-events-auto"
              style={{
                zIndex: 10,
                backgroundColor: 'transparent'
              }}
            />
            
            {/* 로딩 상태 표시 */}
            {!isCanvasReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">필기 도구 준비 중...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFAnnotator;