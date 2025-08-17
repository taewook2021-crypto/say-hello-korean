import React, { useState, useRef, useEffect } from "react";
import { Pen, Highlighter, Eraser, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';

const DrawingApp = () => {
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState([5]);
  const [brushColor, setBrushColor] = useState('#000000');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'
  ];

  const highlighterColors = [
    '#FFFF00', '#FF0000', '#00FF00', '#0000FF',
    '#FFA500', '#FF00FF', '#00FFFF'
  ];

  // Fabric.js 캔버스 초기화
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth - 300, // 사이드바 너비 제외
      height: window.innerHeight,
      isDrawingMode: true,
      selection: false,
      backgroundColor: '#ffffff'
    });

    // 브러시 설정
    const brush = new PencilBrush(canvas);
    brush.width = brushSize[0];
    brush.color = brushColor;
    canvas.freeDrawingBrush = brush;

    // 그리기 완료 이벤트
    canvas.on('path:created', () => {
      console.log('선 그리기 완료');
    });

    setFabricCanvas(canvas);

    // 창 크기 변경 시 캔버스 크기 조정
    const handleResize = () => {
      canvas.setDimensions({
        width: window.innerWidth - 300,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      canvas.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
      fabricCanvas.backgroundColor = '#ffffff';
      fabricCanvas.renderAll();
      toast.success('캔버스가 지워졌습니다.');
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* 좌측 도구 패널 */}
      <div className="w-80 border-r border-border p-6 space-y-6 bg-background">
        <h2 className="text-xl font-bold">그리기 도구</h2>
        
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
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            전체 지우기
          </Button>
        </Card>

        {/* 현재 도구 상태 */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded-full border-2" 
              style={{ backgroundColor: brushColor }}
            ></div>
            <div className="text-sm">
              <div className="font-medium">
                {currentTool === 'pen' ? '펜' : currentTool === 'highlighter' ? '형광펜' : '지우개'}
              </div>
              <div className="text-muted-foreground">
                {brushSize[0]}px
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 캔버스 영역 */}
      <div className="flex-1 bg-white">
        <canvas
          ref={canvasRef}
          className="block"
          style={{
            cursor: currentTool === 'pen' ? 'crosshair' : 
                   currentTool === 'highlighter' ? 'cell' : 'grab'
          }}
        />
      </div>
    </div>
  );
};

export default DrawingApp;