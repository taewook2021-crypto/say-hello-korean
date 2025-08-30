import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';

interface AnnotationCanvasProps {
  width: number;
  height: number;
  currentTool: 'pen' | 'highlighter' | 'eraser';
  brushSize: number;
  brushColor: string;
  onPathCreated?: () => void;
}

export interface AnnotationCanvasRef {
  clear: () => void;
  getFabricCanvas: () => FabricCanvas | null;
}

const AnnotationCanvas = forwardRef<AnnotationCanvasRef, AnnotationCanvasProps>(
  ({ width, height, currentTool, brushSize, brushColor, onPathCreated }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<FabricCanvas | null>(null);
    const isInitializedRef = useRef(false);

    // 외부에서 사용할 수 있는 메서드들
    useImperativeHandle(ref, () => ({
      clear: () => {
        if (fabricCanvasRef.current) {
          try {
            fabricCanvasRef.current.clear();
            fabricCanvasRef.current.renderAll();
          } catch (error) {
            console.warn('캔버스 클리어 중 오류:', error);
          }
        }
      },
      getFabricCanvas: () => fabricCanvasRef.current,
    }));

    // Fabric.js 캔버스 초기화
    useEffect(() => {
      if (!canvasRef.current || isInitializedRef.current) return;

      console.log('Fabric 캔버스 초기화');
      
      try {
        const canvas = new FabricCanvas(canvasRef.current, {
          isDrawingMode: true,
          selection: false,
          backgroundColor: 'transparent',
          width,
          height,
        });

        // 브러시 설정
        const brush = new PencilBrush(canvas);
        brush.width = brushSize;
        brush.color = brushColor;
        canvas.freeDrawingBrush = brush;

        // 터치 이벤트 설정
        if (canvasRef.current) {
          canvasRef.current.style.touchAction = 'none';
        }

        // 이벤트 리스너
        canvas.on('path:created', () => {
          onPathCreated?.();
        });

        fabricCanvasRef.current = canvas;
        isInitializedRef.current = true;

        console.log('Fabric 캔버스 초기화 완료');
      } catch (error) {
        console.error('Fabric 캔버스 초기화 실패:', error);
      }

      // cleanup 함수
      return () => {
        if (fabricCanvasRef.current && isInitializedRef.current) {
          try {
            console.log('Fabric 캔버스 정리 시작');
            fabricCanvasRef.current.dispose();
            fabricCanvasRef.current = null;
            isInitializedRef.current = false;
            console.log('Fabric 캔버스 정리 완료');
          } catch (error) {
            console.warn('Fabric 캔버스 정리 중 오류:', error);
          }
        }
      };
    }, []); // 빈 의존성 배열로 한 번만 초기화

    // 캔버스 크기 업데이트
    useEffect(() => {
      if (fabricCanvasRef.current && isInitializedRef.current) {
        try {
          fabricCanvasRef.current.setDimensions({ width, height });
          fabricCanvasRef.current.renderAll();
          
          // HTML 캔버스 크기도 업데이트
          if (canvasRef.current) {
            canvasRef.current.style.width = width + 'px';
            canvasRef.current.style.height = height + 'px';
          }
        } catch (error) {
          console.warn('캔버스 크기 업데이트 중 오류:', error);
        }
      }
    }, [width, height]);

    // 브러시 설정 업데이트
    useEffect(() => {
      if (!fabricCanvasRef.current || !isInitializedRef.current) return;

      try {
        const canvas = fabricCanvasRef.current;
        const brush = canvas.freeDrawingBrush;
        
        if (brush) {
          const finalWidth = currentTool === 'highlighter' ? brushSize * 2 : brushSize;
          const finalColor = brushColor;
          
          brush.width = finalWidth;
          brush.color = finalColor;
          
          // 하이라이터 모드: multiply 블렌딩
          // @ts-ignore
          canvas.contextTop.globalCompositeOperation = currentTool === 'highlighter' ? 'multiply' : 'source-over';
        }

        canvas.isDrawingMode = currentTool !== 'eraser';

        // 지우개 모드
        if (currentTool === 'eraser') {
          canvas.off('mouse:down');
          canvas.on('mouse:down', (e) => {
            if (e.target) {
              canvas.remove(e.target);
              canvas.renderAll();
            }
          });
        } else {
          canvas.off('mouse:down');
        }
      } catch (error) {
        console.warn('브러시 설정 업데이트 중 오류:', error);
      }
    }, [currentTool, brushSize, brushColor]);

    return (
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0"
        style={{
          cursor: currentTool === 'pen' ? 'crosshair' : 
                   currentTool === 'highlighter' ? 'cell' : 'grab',
          pointerEvents: 'auto',
        }}
      />
    );
  }
);

AnnotationCanvas.displayName = 'AnnotationCanvas';

export default AnnotationCanvas;