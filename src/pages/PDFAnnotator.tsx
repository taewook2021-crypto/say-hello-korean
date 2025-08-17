import React, { useState, useRef } from "react";
import { Upload, Pen, Highlighter, Eraser, Save, Download, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Document, Page, pdfjs } from 'react-pdf';
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker 설정 - 안정적인 CDN 사용
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFPageData {
  pageNumber: number;
  fabricCanvas: FabricCanvas | null;
  containerRef: React.RefObject<HTMLDivElement>;
}

const PDFAnnotator = () => {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pages, setPages] = useState<PDFPageData[]>([]);
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState([2]);
  const [brushColor, setBrushColor] = useState('#000000');
  const [scale, setScale] = useState([1]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'
  ];

  const highlighterColors = [
    '#FFFF0080', '#FF000080', '#00FF0080', '#0000FF80',
    '#FFA50080', '#FF00FF80', '#00FFFF80'
  ];

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF 로드 성공. 페이지 수:', numPages);
    setNumPages(numPages);
    setPageNumber(1);
    
    // 기존 캔버스들 정리
    pages.forEach(page => {
      if (page.fabricCanvas) {
        page.fabricCanvas.dispose();
      }
    });
    
    // 새 페이지 데이터 초기화
    const newPages: PDFPageData[] = [];
    for (let i = 1; i <= numPages; i++) {
      newPages.push({
        pageNumber: i,
        fabricCanvas: null,
        containerRef: React.createRef<HTMLDivElement>()
      });
    }
    setPages(newPages);
    toast.success(`PDF 로드 완료 (${numPages} 페이지)`);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF 로드 실패:', error);
    toast.error(`PDF 파일을 로드할 수 없습니다: ${error.message}`);
  };

  const onPageLoadSuccess = (pageIndex: number) => {
    console.log(`페이지 ${pageIndex + 1} 렌더링 완료`);
    
    // PDF 페이지가 렌더링된 후 Fabric.js 캔버스 초기화
    setTimeout(() => {
      const pageData = pages[pageIndex];
      if (pageData && pageData.containerRef.current && !pageData.fabricCanvas) {
        const pageElement = pageData.containerRef.current.querySelector('.react-pdf__Page');
        if (pageElement) {
          const rect = pageElement.getBoundingClientRect();
          
          // 캔버스 엘리먼트 생성
          const canvasElement = document.createElement('canvas');
          canvasElement.width = rect.width;
          canvasElement.height = rect.height;
          canvasElement.style.position = 'absolute';
          canvasElement.style.top = '0';
          canvasElement.style.left = '0';
          canvasElement.style.pointerEvents = 'auto';
          canvasElement.style.zIndex = '10';
          
          // 컨테이너에 캔버스 추가
          pageData.containerRef.current.style.position = 'relative';
          pageData.containerRef.current.appendChild(canvasElement);
          
          // Fabric.js 캔버스 초기화
          const fabricCanvas = new FabricCanvas(canvasElement, {
            width: rect.width,
            height: rect.height,
            isDrawingMode: true,
            selection: false
          });
          
          setupBrush(fabricCanvas);
          
          // 페이지 데이터 업데이트
          const updatedPages = [...pages];
          updatedPages[pageIndex].fabricCanvas = fabricCanvas;
          setPages(updatedPages);
        }
      }
    }, 100);
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

  const handleFileUpload = (selectedFile: File) => {
    console.log('파일 선택됨:', selectedFile.name, selectedFile.type);
    
    if (selectedFile.type !== 'application/pdf') {
      toast.error('PDF 파일만 업로드 가능합니다.');
      return;
    }

    setFile(selectedFile);
  };

  const handleToolChange = (tool: 'pen' | 'highlighter' | 'eraser') => {
    setCurrentTool(tool);
    
    if (tool === 'highlighter') {
      setBrushColor(highlighterColors[0].slice(0, -2));
    } else if (tool === 'pen') {
      setBrushColor('#000000');
    }
    
    // 모든 캔버스의 브러시 업데이트
    pages.forEach(page => {
      if (page.fabricCanvas) {
        setupBrush(page.fabricCanvas);
      }
    });
  };

  const handleColorChange = (color: string) => {
    setBrushColor(color);
    
    // 모든 캔버스의 브러시 색상 업데이트
    pages.forEach(page => {
      if (page.fabricCanvas) {
        setupBrush(page.fabricCanvas);
      }
    });
  };

  const clearPage = (pageIndex: number) => {
    const pageData = pages[pageIndex];
    if (pageData && pageData.fabricCanvas) {
      pageData.fabricCanvas.clear();
      toast.success(`${pageIndex + 1}페이지 필기가 지워졌습니다.`);
    }
  };

  const saveAnnotations = () => {
    const annotations = pages.map(page => ({
      pageNumber: page.pageNumber,
      data: page.fabricCanvas ? JSON.stringify(page.fabricCanvas.toJSON()) : null
    })).filter(annotation => annotation.data);
    
    const blob = new Blob([JSON.stringify(annotations)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('필기가 저장되었습니다.');
  };

  const loadAnnotations = async (annotationFile: File) => {
    try {
      const text = await annotationFile.text();
      const annotations = JSON.parse(text);
      
      annotations.forEach((annotation: any) => {
        const pageIndex = annotation.pageNumber - 1;
        const pageData = pages[pageIndex];
        if (pageData && pageData.fabricCanvas && annotation.data) {
          pageData.fabricCanvas.loadFromJSON(annotation.data, () => {
            pageData.fabricCanvas!.renderAll();
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
    if (files.length > 0) {
      handleFileUpload(files[0]);
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
              const selectedFile = e.target.files?.[0];
              if (selectedFile) {
                handleFileUpload(selectedFile);
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
            onValueChange={(value) => {
              setBrushSize(value);
              pages.forEach(page => {
                if (page.fabricCanvas) {
                  setupBrush(page.fabricCanvas);
                }
              });
            }}
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
          <h3 className="font-medium mb-3">줌: {Math.round(scale[0] * 100)}%</h3>
          <div className="flex items-center space-x-2 mb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScale([Math.max(0.5, scale[0] - 0.1)])}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScale([Math.min(3, scale[0] + 0.1)])}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          <Slider
            value={scale}
            onValueChange={setScale}
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
              disabled={!file}
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
                  const annotationFile = (e.target as HTMLInputElement).files?.[0];
                  if (annotationFile) loadAnnotations(annotationFile);
                };
                input.click();
              }}
              className="w-full justify-start"
              variant="outline"
              disabled={!file}
            >
              <Download className="w-4 h-4 mr-2" />
              필기 불러오기
            </Button>
          </div>
        </Card>
      </div>

      {/* PDF 뷰어 영역 */}
      <div className="flex-1 overflow-auto">
        {!file ? (
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
          <div className="p-8">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<div className="text-center p-8">PDF 로딩 중...</div>}
            >
              <div className="space-y-8">
                {Array.from(new Array(numPages), (el, index) => (
                  <div key={`page_${index + 1}`} className="mx-auto" style={{ width: 'fit-content' }}>
                    <div 
                      ref={pages[index]?.containerRef}
                      className="relative shadow-lg"
                    >
                      <Page
                        pageNumber={index + 1}
                        scale={scale[0]}
                        onLoadSuccess={() => onPageLoadSuccess(index)}
                        loading={<div className="p-4">페이지 로딩 중...</div>}
                      />
                      
                      {/* 페이지 번호 및 클리어 버튼 */}
                      <div className="absolute top-2 right-2 flex items-center space-x-2">
                        <span className="bg-background/80 px-2 py-1 rounded text-sm">
                          {index + 1}
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
                  </div>
                ))}
              </div>
            </Document>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFAnnotator;