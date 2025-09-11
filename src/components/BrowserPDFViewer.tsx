'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface BrowserPDFViewerProps {
  file: File;
  zoom: number;
  rotation: number;
  onError?: () => void;
}

export default function BrowserPDFViewer({ file, zoom, rotation, onError }: BrowserPDFViewerProps) {
  const [fileUrl, setFileUrl] = useState<string>('');
  const [iframeError, setIframeError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (file) {
      console.log('[PDF Annotator] BrowserPDFViewer 초기화 시작');
      setIsLoading(true);
      setIframeError(false);
      
      // Blob URL 생성 및 즉시 검증
      const url = URL.createObjectURL(file);
      console.log('[PDF Annotator] Blob URL 생성:', url);
      setFileUrl(url);
      
      // 5초 후에 SimplePDFViewer로 fallback (적절한 대기 시간)
      timeoutRef.current = setTimeout(() => {
        console.warn('[PDF Annotator] BrowserPDFViewer 타임아웃 (5초) - SimplePDFViewer로 전환');
        setIframeError(true);
        setIsLoading(false);
        onError?.();
      }, 5000);
      
      return () => {
        URL.revokeObjectURL(url);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [file, onError]);


  const handleRetry = () => {
    setIframeError(false);
    setIsLoading(true);
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
    }
  };

  if (iframeError) {
    return (
      <div 
        className="bg-white shadow-lg border"
        style={{
          transform: `scale(${zoom}) rotate(${rotation}deg)`,
          transformOrigin: 'center'
        }}
      >
        <div className="w-[595px] h-[842px] bg-gradient-to-br from-orange-50 to-red-50 border flex flex-col items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md"
          >
            <AlertCircle size={64} className="mx-auto text-orange-500 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">브라우저 PDF 뷰어 오류</h3>
            <p className="text-gray-600 mb-6">
              이 PDF는 브라우저에서 직접 표시할 수 없습니다. 
              PDF 파일이 암호화되었거나 특별한 형식일 수 있습니다.
            </p>
            
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRetry}
                className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <RefreshCw size={20} />
                <span>다시 시도</span>
              </motion.button>
              
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink size={20} />
                <span>새 탭에서 열기</span>
              </motion.a>
            </div>
            
            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 이 영역에서도 필기와 영역 선택이 가능합니다.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white shadow-lg border relative"
      style={{
        transform: `scale(${zoom}) rotate(${rotation}deg)`,
        transformOrigin: 'center'
      }}
    >
      {fileUrl && (
        <iframe
          src={fileUrl}
          width="595"
          height="842"
          className="border-0"
          title="PDF Viewer"
          onLoad={() => {
            console.log('[PDF Annotator] BrowserPDFViewer iframe 로드 완료');
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            setIsLoading(false);
          }}
          onError={() => {
            console.error('[PDF Annotator] BrowserPDFViewer iframe 오류');
            setIframeError(true);
            setIsLoading(false);
            onError?.();
          }}
        />
      )}
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">브라우저 PDF 뷰어로 로딩 중...</p>
            <p className="text-xs text-gray-400 mt-1">5초 후 대체 뷰어 사용</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}