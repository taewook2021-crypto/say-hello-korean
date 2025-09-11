import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Trash2, Edit3, Square, Circle } from 'lucide-react';
import PDFViewer from '@/components/PDFViewer';
import { toast } from 'sonner';

export default function PDFAnnotator() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [isAnnotationMode, setIsAnnotationMode] = useState(true);

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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF 필기 도구</h1>
          <p className="text-gray-600">PDF 파일을 업로드하고 필기할 수 있습니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 사이드바 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 파일 업로드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  파일 업로드
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                {selectedFile && (
                  <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                    <p className="font-medium text-green-800">{selectedFile.name}</p>
                    <p className="text-green-600">
                      {Math.round(selectedFile.size / 1024)}KB
                      {numPages > 0 && ` • ${numPages}페이지`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 뷰어 컨트롤 */}
            <Card>
              <CardHeader>
                <CardTitle>뷰어 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium">줌 레벨: {(zoom * 100).toFixed(0)}%</label>
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" variant="outline" onClick={handleZoomOut}>-</Button>
                    <Button size="sm" variant="outline" onClick={handleZoomIn}>+</Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">회전: {rotation}°</label>
                  <div className="mt-1">
                    <Button size="sm" variant="outline" onClick={handleRotate}>90° 회전</Button>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={handleReset} className="w-full">
                  초기화
                </Button>
              </CardContent>
            </Card>

            {/* 필기 도구 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  필기 도구
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Button 
                    variant={isAnnotationMode ? "default" : "outline"}
                    onClick={() => setIsAnnotationMode(!isAnnotationMode)}
                    className="w-full"
                  >
                    {isAnnotationMode ? '필기 모드 ON' : '필기 모드 OFF'}
                  </Button>
                </div>
                
                {isAnnotationMode && (
                  <>
                    <div>
                      <label className="text-sm font-medium">브러시 크기</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="20" 
                        defaultValue="2"
                        className="w-full mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">색상</label>
                      <div className="flex gap-2 mt-1">
                        <div className="w-6 h-6 bg-red-500 rounded cursor-pointer border border-gray-300"></div>
                        <div className="w-6 h-6 bg-blue-500 rounded cursor-pointer border border-gray-300"></div>
                        <div className="w-6 h-6 bg-green-500 rounded cursor-pointer border border-gray-300"></div>
                        <div className="w-6 h-6 bg-black rounded cursor-pointer border border-gray-300"></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Square className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Circle className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button size="sm" variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      모두 지우기
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 저장/불러오기 */}
            <Card>
              <CardHeader>
                <CardTitle>저장 및 내보내기</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button size="sm" variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  필기 저장
                </Button>
                <Button size="sm" variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  PDF 내보내기
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* PDF 뷰어 영역 */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardContent className="p-4">
                <div className="flex justify-center items-center min-h-[600px] bg-gray-100 rounded-lg overflow-auto">
                  <PDFViewer
                    file={selectedFile}
                    zoom={zoom}
                    rotation={rotation}
                    onLoadSuccess={(data) => setNumPages(data.numPages)}
                    enableAnnotation={isAnnotationMode}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}