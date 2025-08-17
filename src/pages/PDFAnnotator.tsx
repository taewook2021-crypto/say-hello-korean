import React, { useState, useRef, useEffect } from "react";
import { Upload, Pen, Highlighter, Eraser, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Canvas as FabricCanvas, PencilBrush, Path } from 'fabric';

const DrawingApp = () => {
  const [mode, setMode] = useState<'pdf' | 'canvas'>('pdf');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState([5]);
  const [brushColor, setBrushColor] = useState('#000000');
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'
  ];

  const highlighterColors = [
    '#FFFF00', '#FF0000', '#00FF00', '#0000FF',
    '#FFA500', '#FF00FF', '#00FFFF'
  ];

  // PDF 파일 업로드
  const handleFileUpload = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('PDF 파일만 업로드 가능합니다.');
      return;
    }

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    
    const url = URL.createObjectURL(file);
    setPdfFile(file);
    setPdfUrl(url);
    toast.success('PDF 파일이 로드되었습니다.');
  };

  // Canvas 크기를 PDF container와 맞춤
  const resizeCanvas = () => {
    if (!containerRef.current || !canvasRef.current || !fabricCanvas) return;
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    console.log('Canvas 크기 조정:', width, 'x', height);
    
    // HTML Canvas 크기 설정
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    // Fabric Canvas 크기 설정
    fabricCanvas.setDimensions({ width, height });
    fabricCanvas.renderAll();
    
    console.log('Canvas 크기 조정 완료');
  };

  // Fabric.js 캔버스 초기화 (필기 모드일 때만)
  useEffect(() => {
    if (!canvasRef.current || mode !== 'canvas') {
      console.log('Canvas 초기화 조건 미충족:', { canvasRef: !!canvasRef.current, mode });
      return;
    }

    console.log('Canvas 초기화 시작');

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth - 320, // 사이드바 너비 제외
      height: window.innerHeight,
      isDrawingMode: true,
      selection: false,
      backgroundColor: 'transparent' // 투명 배경
    });

    // 브러시 설정
    const brush = new PencilBrush(canvas);
    brush.width = brushSize[0];
    brush.color = brushColor;
    canvas.freeDrawingBrush = brush;

    // 터치 이벤트 설정
    const canvasElement = canvas.getElement();
    canvasElement.style.touchAction = 'none';

    // 그리기 완료 이벤트
    canvas.on('path:created', () => {
      console.log('선 그리기 완료');
      toast.success('필기 완료!');
    });

    console.log('Canvas 초기화 완료, Fabric Canvas 설정됨');
    setFabricCanvas(canvas);

    // 창 크기 변경 시 캔버스 크기 조정
    const handleResize = () => {
      setTimeout(resizeCanvas, 100);
    };

    window.addEventListener('resize', handleResize);

    // 초기 크기 조정
    setTimeout(resizeCanvas, 1000);
    setTimeout(resizeCanvas, 2000);

    return () => {
      canvas.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [mode]); // mode가 변경될 때만

  // 브러시 설정 업데이트
  useEffect(() => {
    if (!fabricCanvas) return;

    const brush = fabricCanvas.freeDrawingBrush;
    if (brush) {
      brush.width = currentTool === 'highlighter' ? brushSize[0] * 2 : brushSize[0];
      brush.color = currentTool === 'highlighter' ? brushColor + '80' : brushColor;
    }

    fabricCanvas.isDrawingMode = currentTool !== 'eraser';

    // 지우개 모드
    if (currentTool === 'eraser') {
      fabricCanvas.off('mouse:down');
      fabricCanvas.on('mouse:down', (e) => {
        if (e.target) {
          fabricCanvas.remove(e.target);
          fabricCanvas.renderAll();
        }
      });
    } else {
      fabricCanvas.off('mouse:down');
    }
  }, [currentTool, brushSize, brushColor, fabricCanvas]);

  const handleToolChange = (tool: 'pen' | 'highlighter' | 'eraser') => {
    setCurrentTool(tool);
    
    if (tool === 'highlighter') {
      setBrushColor('#FFFF00');
    } else if (tool === 'pen') {
      setBrushColor('#000000');
    }
  };

  const handleColorChange = (color: string) => {
    setBrushColor(color);
  };

  const handleBrushSizeChange = (size: number[]) => {
    setBrushSize(size);
  };

  const clearCanvas = () => {
    if (fabricCanvas) {
      fabricCanvas.clear();
      fabricCanvas.renderAll();
      toast.success('필기가 지워졌습니다.');
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

  // URL 정리
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 상단 토글 버튼 */}
      <div className="border-b border-border p-4">
        <div className="flex gap-2">
          <Button
            variant={mode === 'pdf' ? 'default' : 'outline'}
            onClick={() => setMode('pdf')}
            disabled={!pdfUrl}
          >
            PDF 보기
          </Button>
          <Button
            variant={mode === 'canvas' ? 'default' : 'outline'}
            onClick={() => setMode('canvas')}
            disabled={!pdfUrl}
          >
            필기 모드
          </Button>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 툴바 (필기 모드일 때만 표시) */}
        {mode === 'canvas' && (
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
                onValueChange={handleBrushSizeChange}
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
                    onClick={() => handleColorChange(color)}
                    title={`색상: ${color}`}
                  />
                ))}
              </div>
            </Card>

            {/* 전체 지우기 */}
            <Card className="p-4">
              <Button
                onClick={clearCanvas}
                className="w-full"
                variant="outline"
                disabled={!fabricCanvas}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                전체 지우기
              </Button>
            </Card>

            {/* 테스트 버튼 */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">테스트</h3>
              <Button
                onClick={() => {
                  if (fabricCanvas) {
                    console.log('테스트 선 그리기 시작');
                    const pathData = 'M 100 100 L 200 150 L 150 200';
                    const pathObj = new Path(pathData, {
                      stroke: brushColor,
                      strokeWidth: brushSize[0],
                      fill: '',
                      selectable: false
                    });
                    
                    fabricCanvas.add(pathObj);
                    fabricCanvas.renderAll();
                    console.log('테스트 선 추가됨');
                    toast.success('테스트 선이 그어졌습니다!');
                  }
                }}
                className="w-full"
                variant="outline"
                disabled={!fabricCanvas}
              >
                테스트 선 그리기
              </Button>
            </Card>
          </div>
        )}

        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1 overflow-hidden">
          {!pdfUrl ? (
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
                >
                  <Upload className="w-4 h-4 mr-2" />
                  파일 선택
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
            // PDF와 Canvas 영역
            <div className="relative w-full h-full">
              {/* PDF iframe (항상 표시, 배경 역할) */}
              <iframe
                ref={iframeRef}
                src={pdfUrl}
                className="w-full h-full border-0"
                title="PDF 뷰어"
                style={{
                  display: 'block',
                  zIndex: 1
                }}
              />

              {/* Canvas 오버레이 (필기 모드일 때만 표시) */}
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full"
                style={{
                  display: mode === 'canvas' ? 'block' : 'none',
                  zIndex: 20,
                  pointerEvents: mode === 'canvas' ? 'auto' : 'none',
                  touchAction: 'none',
                  backgroundColor: 'transparent',
                  cursor: mode === 'canvas' ? 
                    (currentTool === 'pen' ? 'crosshair' : 
                     currentTool === 'highlighter' ? 'cell' : 'grab') : 'default'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrawingApp;