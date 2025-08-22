import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Download, Printer } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import EditableText from './EditableText';

interface QAItem {
  id: string;
  question: string;
  answer: string;
}

interface AROData {
  projectName: string;
  nodeName: string;
  archiveName: string;
  projectContent: string;
  content: string;
  qaItems: QAItem[];
}

interface AROHybridTemplateProps {
  onDataChange?: (data: AROData) => void;
}

const AROHybridTemplate: React.FC<AROHybridTemplateProps> = ({ onDataChange }) => {
  const [conversationText, setConversationText] = useState('');
  const [data, setData] = useState<AROData>({
    projectName: '',
    nodeName: '',
    archiveName: '',
    projectContent: '',
    content: '',
    qaItems: Array.from({ length: 8 }, (_, i) => ({
      id: `qa-${i + 1}`,
      question: '',
      answer: ''
    }))
  });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onDataChange?.(data);
  }, [data, onDataChange]);

  // AI 대화 내용 자동 분석 및 채우기
  const autoFillFromConversation = () => {
    if (!conversationText.trim()) return;

    // 간단한 패턴 매칭으로 내용 추출 (실제로는 더 정교한 AI 분석 필요)
    const lines = conversationText.split('\n').filter(line => line.trim());
    
    // Project 추출 (첫 번째 주요 질문이나 주제)
    const projectLine = lines.find(line => 
      line.includes('프로젝트') || line.includes('주제') || line.includes('과제')
    );
    
    // Q&A 추출 (질문과 답변 패턴)
    const qaMatches: QAItem[] = [];
    let qaId = 1;
    
    for (let i = 0; i < lines.length && qaMatches.length < 8; i++) {
      const line = lines[i];
      if (line.includes('?') || line.includes('질문') || line.startsWith('Q:')) {
        const question = line.replace(/^Q:\s*/, '').trim();
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.includes('?')) {
          const answer = nextLine.replace(/^A:\s*/, '').trim();
          qaMatches.push({
            id: `qa-${qaId}`,
            question,
            answer
          });
          qaId++;
          i++; // Skip the answer line
        }
      }
    }

    // 나머지 내용을 Content로 사용
    const contentLines = lines.filter(line => 
      !line.includes('?') && 
      !line.includes('질문') && 
      !line.startsWith('Q:') && 
      !line.startsWith('A:')
    );

    setData(prev => ({
      ...prev,
      projectContent: projectLine?.substring(0, 200) || '',
      content: contentLines.slice(0, 10).join('\n'),
      qaItems: prev.qaItems.map((item, index) => 
        qaMatches[index] || item
      )
    }));
  };

  const updateData = (field: keyof AROData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updateQAItem = (index: number, field: 'question' | 'answer', value: string) => {
    setData(prev => ({
      ...prev,
      qaItems: prev.qaItems.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addQAItem = () => {
    if (data.qaItems.length >= 8) return;
    setData(prev => ({
      ...prev,
      qaItems: [...prev.qaItems, {
        id: `qa-${prev.qaItems.length + 1}`,
        question: '',
        answer: ''
      }]
    }));
  };

  const removeQAItem = (index: number) => {
    setData(prev => ({
      ...prev,
      qaItems: prev.qaItems.filter((_, i) => i !== index)
    }));
  };

  const generatePDF = async () => {
    if (!printRef.current) return;

    const opt = {
      margin: 0.5,
      filename: `${data.projectName || 'ARO-지식정리'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true,
        allowTaint: false
      },
      jsPDF: { 
        unit: 'in', 
        format: 'a4', 
        orientation: 'landscape'
      }
    };

    try {
      await html2pdf().set(opt).from(printRef.current).save();
    } catch (error) {
      console.error('PDF 생성 오류:', error);
    }
  };

  const printDocument = () => {
    window.print();
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      {/* 입력 섹션 */}
      <Card className="mb-8 p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">ARO 지식 정리 하이브리드 템플릿</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Project명</label>
            <Input
              value={data.projectName}
              onChange={(e) => updateData('projectName', e.target.value)}
              placeholder="프로젝트명을 입력하세요"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Node명</label>
            <Input
              value={data.nodeName}
              onChange={(e) => updateData('nodeName', e.target.value)}
              placeholder="노드명을 입력하세요"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Archive명</label>
            <Input
              value={data.archiveName}
              onChange={(e) => updateData('archiveName', e.target.value)}
              placeholder="아카이브명을 입력하세요"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">AI 대화 내용</label>
          <Textarea
            value={conversationText}
            onChange={(e) => setConversationText(e.target.value)}
            placeholder="AI와의 대화 내용을 붙여넣으세요..."
            className="min-h-[150px]"
          />
        </div>

        <div className="flex gap-2 mb-6">
          <Button onClick={autoFillFromConversation} className="flex items-center gap-2">
            자동 분석 및 채우기
          </Button>
          <Button onClick={generatePDF} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            PDF 다운로드
          </Button>
          <Button onClick={printDocument} variant="outline" className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            인쇄
          </Button>
        </div>
      </Card>

      {/* 편집 가능한 템플릿 */}
      <Card className="overflow-hidden">
        <div 
          ref={printRef}
          className="bg-white p-8"
          style={{
            width: '100%',
            maxWidth: '297mm',
            margin: '0 auto',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
            fontSize: '11px',
            lineHeight: '1.4',
            color: '#000',
            minHeight: '210mm'
          }}
        >
          {/* 헤더 */}
          <div className="text-center border-b border-gray-300 pb-4 mb-6">
            <EditableText
              value={data.projectName || 'ARO 지식 정리'}
              onChange={(value) => updateData('projectName', value)}
              placeholder="제목을 입력하세요"
              className="text-xl font-semibold justify-center"
            />
            <div className="text-sm text-gray-500 mt-2">Made By ARO</div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="flex gap-6 h-full">
            {/* 좌측 섹션 (60%) */}
            <div className="w-3/5 flex flex-col gap-6">
              {/* Project 섹션 */}
              <div className="border border-gray-300 rounded-lg p-4 bg-white">
                <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-gray-200">
                  Project
                </h3>
                <EditableText
                  value={data.projectContent}
                  onChange={(value) => updateData('projectContent', value)}
                  placeholder="프로젝트 내용을 입력하세요"
                  multiline
                  className="min-h-[80px] text-xs bg-gray-50 rounded"
                />
              </div>

              {/* Content 섹션 */}
              <div className="border border-gray-300 rounded-lg p-4 bg-white flex-1">
                <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-gray-200">
                  Content
                </h3>
                <EditableText
                  value={data.content}
                  onChange={(value) => updateData('content', value)}
                  placeholder="학습 내용을 입력하세요"
                  multiline
                  className="min-h-[300px] text-xs bg-gray-50 rounded"
                />
              </div>
            </div>

            {/* 우측 섹션 (40%) */}
            <div className="w-2/5">
              <div className="border border-gray-300 rounded-lg p-4 bg-white h-full">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold">Q&A</h3>
                  <div className="flex gap-1">
                    {data.qaItems.length < 8 && (
                      <Button
                        onClick={addQAItem}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {data.qaItems.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 rounded p-2 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs font-medium">Q{index + 1}:</span>
                            <Button
                              onClick={() => removeQAItem(index)}
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <EditableText
                            value={item.question}
                            onChange={(value) => updateQAItem(index, 'question', value)}
                            placeholder="질문을 입력하세요"
                            className="text-xs min-h-[24px] bg-white rounded"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium mb-1">A:</div>
                        <EditableText
                          value={item.answer}
                          onChange={(value) => updateQAItem(index, 'answer', value)}
                          placeholder="답변을 입력하세요"
                          multiline
                          className="text-xs min-h-[32px] bg-white rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0.5in;
          }
          
          body * {
            visibility: hidden;
          }
          
          div[ref="printRef"], div[ref="printRef"] * {
            visibility: visible;
          }
          
          div[ref="printRef"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

export default AROHybridTemplate;