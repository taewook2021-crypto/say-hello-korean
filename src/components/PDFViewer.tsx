'use client';

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Canvas as FabricCanvas } from 'fabric';
import SimplePDFViewer from './SimplePDFViewer';
import BrowserPDFViewer from './BrowserPDFViewer';

// PDF.js worker 설정 - 로컬 worker 우선 사용
if (typeof window !== 'undefined') {
  // Chrome 차단 문제 해결을 위해 로컬 worker 우선 사용
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  console.log('PDF Worker 설정 완료: 로컬 worker 사용');
}

interface PDFViewerProps {
  file: File | null;
  zoom: number;
  rotation: number;
  onLoadSuccess?: (data: { numPages: number }) => void;
  enableAnnotation?: boolean;
}

export default function PDFViewer({ file, zoom, rotation, onLoadSuccess, enableAnnotation = false }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [hasError, setHasError] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [useBrowserViewer, setUseBrowserViewer] = useState<boolean>(false); // react-pdf를 먼저 사용
  const [useReactPdf, setUseReactPdf] = useState<boolean>(true); // react-pdf 우선 사용
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log('PDF Document 로드 성공:', numPages, '페이지');
    setNumPages(numPages);
    setHasError(false);
    onLoadSuccess?.({ numPages });
    
    // PDF 로드 성공 시 필기 캔버스 초기화
    if (enableAnnotation) {
      console.log('필기 캔버스 초기화 예약');
      setTimeout(initializeCanvas, 100);
    }
  }

  function onDocumentLoadError(error: Error) {
    console.error('=== PDF Document 로딩 에러 ===');
    console.error('에러 상세:', error);
    console.error('파일 크기:', file?.size, 'bytes');
    console.error('파일 타입:', file?.type);
    console.error('파일명:', file?.name);
    
    setHasError(true);
    // react-pdf 실패 시 BrowserPDFViewer로 시도
    console.log('BrowserPDFViewer로 fallback 시도');
    setUseReactPdf(false);
    setUseBrowserViewer(true);
  }

  function onDocumentLoadProgress({ loaded, total }: { loaded: number; total: number }) {
    const progress = Math.round((loaded / total) * 100);
    console.log(`PDF 로딩 진행률: ${progress}% (${loaded}/${total} bytes)`);
    setLoadingProgress(progress);
  }

  // 새 파일이 업로드될 때 에러 상태 리셋 및 뷰어 선택
  useEffect(() => {
    if (file) {
      setHasError(false);
      setPageNumber(1);
      setNumPages(0);
      setLoadingProgress(0);
      setUseReactPdf(true); // 항상 react-pdf부터 시도
      setUseBrowserViewer(false);
      
      // 파일 크기 체크
      const fileSizeInMB = file.size / (1024 * 1024);
      console.log(`[PDF Annotator] 새 PDF 파일 업로드:`);
      console.log(`  • 파일명: ${file.name}`);
      console.log(`  • 크기: ${fileSizeInMB.toFixed(2)}MB`);
      console.log(`  • 타입: ${file.type}`);
      console.log(`  • 뷰어 전략: 3단계 fallback (react-pdf → BrowserPDFViewer → SimplePDFViewer)`);
      
      if (fileSizeInMB > 200) {
        // 200MB 초과 시에도 react-pdf부터 시도
        console.warn(`[PDF Annotator] 매우 큰 PDF 파일 감지: ${fileSizeInMB.toFixed(2)}MB - react-pdf부터 시도`);
      }
      
      console.log(`[PDF Annotator] PDF 파일 (${fileSizeInMB.toFixed(2)}MB) - react-pdf 우선 시도`);
    }
  }, [file]);

  // 필기 캔버스 초기화
  const initializeCanvas = () => {
    if (!enableAnnotation || !canvasRef.current) return;

    // 기존 캔버스가 있으면 제거
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
    }

    // 새 Fabric 캔버스 생성
    const canvas = new FabricCanvas(canvasRef.current, {
      width: 595,
      height: 842,
      isDrawingMode: true,
    });

    // 브러시 설정
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = 2;
      canvas.freeDrawingBrush.color = '#ff0000';
    }

    fabricCanvasRef.current = canvas;

    // 줌과 회전 적용
    canvas.setZoom(zoom);
    if (rotation !== 0) {
      canvas.setViewportTransform([
        Math.cos(rotation * Math.PI / 180),
        Math.sin(rotation * Math.PI / 180),
        -Math.sin(rotation * Math.PI / 180),
        Math.cos(rotation * Math.PI / 180),
        0,
        0
      ]);
    }
  };

  // 줌이나 회전이 변경될 때 캔버스 업데이트
  useEffect(() => {
    if (fabricCanvasRef.current && enableAnnotation) {
      const canvas = fabricCanvasRef.current;
      canvas.setZoom(zoom);
      
      if (rotation !== 0) {
        canvas.setViewportTransform([
          Math.cos(rotation * Math.PI / 180),
          Math.sin(rotation * Math.PI / 180),
          -Math.sin(rotation * Math.PI / 180),
          Math.cos(rotation * Math.PI / 180),
          0,
          0
        ]);
      } else {
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      }
      canvas.renderAll();
    }
  }, [zoom, rotation, enableAnnotation]);

  // 컴포넌트 언마운트 시 캔버스 정리
  useEffect(() => {
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, []);

  if (!file) {
    return (
      <div className="w-[595px] h-[842px] bg-white border flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">PDF를 업로드하세요</p>
          <p className="text-sm mt-2">PDF 파일을 선택하면 여기에 표시됩니다</p>
        </div>
      </div>
    );
  }


  // react-pdf를 우선 사용
  if (useReactPdf && !hasError) {
    // react-pdf Document/Page 렌더링이 여기서 실행됨
    console.log('[PDF Annotator] react-pdf로 표시 중 (1차 시도)');
  } else if (useBrowserViewer && !useReactPdf) {
    return (
      <BrowserPDFViewer 
        file={file} 
        zoom={zoom} 
        rotation={rotation} 
        onError={() => {
          console.log('[PDF Annotator] BrowserPDFViewer 실패 - SimplePDFViewer로 3차 시도');
          setUseBrowserViewer(false);
          setHasError(true);
        }}
      />
    );
  }

  // 모든 뷰어가 실패한 경우 SimplePDFViewer 사용
  if (hasError && !useBrowserViewer) {
    console.log('[PDF Annotator] SimplePDFViewer로 표시 중 (최종 fallback)');
    return <SimplePDFViewer file={file} zoom={zoom} rotation={rotation} />;
  }

  return (
    <div 
      ref={containerRef}
      className="bg-white shadow-lg border relative"
      style={{
        transform: `scale(${zoom}) rotate(${rotation}deg)`,
        transformOrigin: 'center'
      }}
    >
      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        onLoadProgress={onDocumentLoadProgress}
        options={{
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/standard_fonts/`,
          // 최적화된 옵션
          isEvalSupported: false,
          disableFontFace: false,
          disableRange: true, // 작은 파일은 한 번에 로드
          disableStream: true, // 스트리밍 비활성화
          disableAutoFetch: false,
          pdfBug: false,
          verbosity: 0,
          // 에러 복구 옵션
          stopAtErrors: false,
          maxImageSize: 1024 * 1024,
          // CORS 및 보안 관련
          withCredentials: false,
        }}
        loading={
          <div className="w-[595px] h-[842px] bg-white border flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 mb-3">PDF 로딩 중...</p>
              {loadingProgress > 0 && (
                <div className="w-48 mx-auto">
                  <div className="bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${loadingProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{loadingProgress}% 완료</p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">
                파일 크기: {file?.size ? Math.round(file.size / 1024) : 0}KB
              </p>
            </div>
          </div>
        }
        error={
          <div className="w-[595px] h-[842px] bg-white border flex items-center justify-center text-red-500">
            <div className="text-center">
              <p className="text-lg font-medium">PDF 로딩 실패</p>
              <p className="text-sm mt-2">다른 PDF 파일을 시도해보세요</p>
              <p className="text-xs mt-1 text-gray-400">지원 형식: PDF 1.3 이상</p>
            </div>
          </div>
        }
      >
        <Page
          pageNumber={pageNumber}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          width={595}
          loading={
            <div className="w-[595px] h-[842px] bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-pulse bg-gray-300 rounded mb-2" style={{width: '80%', height: '20px'}}></div>
                <div className="animate-pulse bg-gray-300 rounded mb-2" style={{width: '60%', height: '20px'}}></div>
                <div className="animate-pulse bg-gray-300 rounded" style={{width: '70%', height: '20px'}}></div>
              </div>
            </div>
          }
          error={
            <div className="w-[595px] h-[842px] bg-white border flex items-center justify-center text-red-500">
              <div className="text-center">
                <p className="text-sm">페이지를 렌더링할 수 없습니다</p>
              </div>
            </div>
          }
        />
        
        {/* 필기 캔버스 레이어 */}
        {enableAnnotation && (
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-auto z-10"
            style={{
              width: '595px',
              height: '842px',
            }}
          />
        )}
      </Document>
      
      {/* Page Navigation */}
      {numPages > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="px-2 py-1 bg-blue-600 rounded disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm">
              {pageNumber} / {numPages}
            </span>
            <button
              onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
              disabled={pageNumber >= numPages}
              className="px-2 py-1 bg-blue-600 rounded disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}