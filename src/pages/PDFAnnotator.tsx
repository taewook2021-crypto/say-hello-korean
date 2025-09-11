import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Trash2, Edit3, Square, Circle, ArrowLeft } from 'lucide-react';
import PDFViewer from '@/components/PDFViewer';
import ChatInterface from '@/components/ChatInterface';
import { useGPTChat } from '@/hooks/useGPTChat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function PDFAnnotator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [isAnnotationMode, setIsAnnotationMode] = useState(true);
  const [isLoadingStorageFile, setIsLoadingStorageFile] = useState(false);
  const [pdfContent, setPdfContent] = useState<string>('');
  
  const { messages, isLoading, sendMessage, clearMessages } = useGPTChat();

  // URL 파라미터에서 파일 경로 확인 및 자동 로드
  useEffect(() => {
    const filePath = searchParams.get('file');
    const subject = searchParams.get('subject');
    
    console.log('URL 파라미터 확인:', { filePath, subject });
    
    if (filePath && subject) {
      console.log('자동 PDF 로드 시작');
      loadPDFFromStorage(filePath, subject);
    } else {
      console.log('URL 파라미터 없음 - 수동 업로드 모드');
    }
  }, [searchParams]);

  // Storage에서 PDF 파일 로드
  const loadPDFFromStorage = async (filePath: string, subject: string) => {
    console.log('=== PDF 로드 시작 ===');
    console.log('파일 경로:', filePath);
    console.log('과목:', subject);
    
    setIsLoadingStorageFile(true);
    
    try {
      console.log('Storage에서 다운로드 시도...');
      
      // Storage에서 파일 다운로드
      const { data, error } = await supabase.storage
        .from('pdfs')
        .download(filePath);

      if (error) {
        console.error('Storage 다운로드 에러:', error);
        throw new Error(`Storage 에러: ${error.message}`);
      }

      console.log('Storage 다운로드 성공:', {
        size: data.size,
        type: data.type
      });

      // Blob을 File 객체로 변환
      const fileName = filePath.split('/').pop() || 'document.pdf';
      const file = new File([data], fileName, {
        type: 'application/pdf'
      });

      console.log('File 객체 생성 완료:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      setSelectedFile(file);
      console.log('PDF 로드 완료!');
      toast.success(`${subject} 과목의 PDF가 로드되었습니다.`);
    } catch (error) {
      console.error('=== PDF 로드 실패 ===');
      console.error('에러:', error);
      toast.error(`PDF 파일을 불러오는데 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      
      // 에러 발생시 수동 업로드 모드로 전환
      setSelectedFile(null);
    } finally {
      console.log('로딩 상태 해제');
      setIsLoadingStorageFile(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      toast.success('PDF 파일이 로드되었습니다.');
    } else {
      toast.error('PDF 파일만 업로드할 수 있습니다.');
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleChatMessage = (message: string) => {
    sendMessage(message, pdfContent);
  };

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              홈으로
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">PDF 뷰어 & AI 채팅</h1>
          </div>
          
          {/* 뷰어 컨트롤 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              줌: {(zoom * 100).toFixed(0)}%
            </div>
            <Button size="sm" variant="outline" onClick={handleZoomOut}>-</Button>
            <Button size="sm" variant="outline" onClick={handleZoomIn}>+</Button>
            <Button size="sm" variant="outline" onClick={handleRotate}>↻</Button>
            <Button size="sm" variant="outline" onClick={handleReset}>초기화</Button>
            
            <div className="mx-2 h-4 w-px bg-gray-300"></div>
            
            <Button 
              size="sm"
              variant={isAnnotationMode ? "default" : "outline"}
              onClick={() => setIsAnnotationMode(!isAnnotationMode)}
            >
              <Edit3 className="h-4 w-4 mr-1" />
              {isAnnotationMode ? '필기 ON' : '필기 OFF'}
            </Button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 영역 - 7:3 분할 */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* 왼쪽: PDF 뷰어 영역 (70%) */}
        <div className="w-[70%] bg-white border-r border-gray-200">
          <div className="h-full flex items-center justify-center p-4">
            {isLoadingStorageFile ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-lg mb-2">PDF 파일을 불러오는 중...</p>
                <p className="text-gray-500 text-sm">잠시만 기다려주세요</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => {
                    console.log('수동 로딩 취소');
                    setIsLoadingStorageFile(false);
                    setSelectedFile(null);
                  }}
                >
                  취소
                </Button>
              </div>
            ) : selectedFile ? (
              <div className="max-w-full max-h-full overflow-auto bg-gray-100 rounded-lg">
                <PDFViewer
                  file={selectedFile}
                  zoom={zoom}
                  rotation={rotation}
                  onLoadSuccess={(data) => {
                    console.log('PDF 뷰어 로드 성공:', data.numPages, '페이지');
                    setNumPages(data.numPages);
                  }}
                  enableAnnotation={isAnnotationMode}
                />
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <Upload className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-medium mb-2">PDF 파일을 업로드해주세요</p>
                <p className="text-sm text-gray-400 mb-4">홈에서 "PDF 첨부" 버튼을 사용하거나 아래에서 직접 선택하세요</p>
                <div className="mt-4">
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="cursor-pointer max-w-xs mx-auto"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 채팅 영역 (30%) */}
        <div className="w-[30%] bg-gray-50">
          <div className="h-full p-4">
            <ChatInterface 
              onSendMessage={handleChatMessage}
              isLoading={isLoading}
              messages={messages}
            />
          </div>
        </div>
      </div>
    </div>
  );
}