'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Eye } from 'lucide-react';

interface SimplePDFViewerProps {
  file: File;
  zoom: number;
  rotation: number;
}

export default function SimplePDFViewer({ file, zoom, rotation }: SimplePDFViewerProps) {
  const [fileUrl, setFileUrl] = useState<string>('');
  
  console.log('[PDF Annotator] SimplePDFViewer 활성화됨 - 파일 정보 뷰어 모드');

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div 
      className="bg-white shadow-lg border"
      style={{
        transform: `scale(${zoom}) rotate(${rotation}deg)`,
        transformOrigin: 'center'
      }}
    >
      <div className="w-[595px] h-[842px] bg-gradient-to-br from-gray-50 to-gray-100 border flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="mb-6">
            <FileText size={80} className="mx-auto text-blue-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">PDF 파일</h3>
            <p className="text-gray-600">
              {file.size > 200 * 1024 * 1024 ? 
                '매우 큰 PDF 파일입니다 (200MB+)' : 
                file.size > 100 * 1024 * 1024 ? 
                '대용량 PDF 파일입니다 (100MB+)' : 
                '브라우저에서 직접 렌더링할 수 없는 PDF입니다'
              }
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
            <div className="text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">파일명:</span>
                <span className="font-medium text-gray-800 truncate ml-2" title={file.name}>
                  {file.name.length > 20 ? `${file.name.substring(0, 20)}...` : file.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">크기:</span>
                <span className="font-medium text-gray-800">{formatFileSize(file.size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">타입:</span>
                <span className="font-medium text-gray-800">PDF 문서</span>
              </div>
              {file.size > 50 * 1024 * 1024 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">상태:</span>
                  <span className={`font-medium ${
                    file.size > 200 * 1024 * 1024 ? 'text-red-600' :
                    file.size > 100 * 1024 * 1024 ? 'text-orange-600' : 'text-yellow-600'
                  }`}>
                    {file.size > 200 * 1024 * 1024 ? '🔴 매우 큰 파일' :
                     file.size > 100 * 1024 * 1024 ? '🟠 대용량 파일' : '🟡 큰 파일'}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Eye size={20} />
              <span>새 탭에서 보기</span>
            </motion.a>
            
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={fileUrl}
              download={file.name}
              className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download size={20} />
              <span>다운로드</span>
            </motion.a>
          </div>
          
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              💡 이 영역에서도 필기와 영역 선택이 가능합니다. 
              선택한 영역은 AI 채팅으로 전송됩니다.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}