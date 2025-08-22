import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import html2pdf from 'html2pdf.js';

interface QAItem {
  id: string;
  question: string;
  answer: string;
}

interface AROTemplateData {
  title: string;
  project: string;
  content: string;
  qaItems: QAItem[];
}

const AROTemplate: React.FC = () => {
  const [data, setData] = useState<AROTemplateData>({
    title: 'ARO 지식 정리',
    project: '',
    content: '',
    qaItems: Array.from({ length: 8 }, (_, i) => ({
      id: `qa-${i + 1}`,
      question: '',
      answer: ''
    }))
  });

  const contentRef = useRef<HTMLDivElement>(null);

  const updateTitle = (title: string) => {
    setData(prev => ({ ...prev, title }));
  };

  const updateProject = (project: string) => {
    setData(prev => ({ ...prev, project }));
  };

  const updateContent = (content: string) => {
    setData(prev => ({ ...prev, content }));
  };

  const updateQAItem = (index: number, field: 'question' | 'answer', value: string) => {
    setData(prev => ({
      ...prev,
      qaItems: prev.qaItems.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const generatePDF = async () => {
    if (!contentRef.current) return;

    const opt = {
      margin: 0.5,
      filename: `${data.title}.pdf`,
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
      await html2pdf().set(opt).from(contentRef.current).save();
    } catch (error) {
      console.error('PDF 생성 오류:', error);
    }
  };

  const printDocument = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !contentRef.current) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${data.title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
              background: #fff;
            }
            
            @page {
              size: A4 landscape;
              margin: 0.5in;
            }
            
            .print-container {
              width: 100%;
              height: 100vh;
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            
            .header {
              text-align: center;
              border-bottom: 1px solid #e5e5e5;
              padding-bottom: 12px;
              margin-bottom: 8px;
            }
            
            .header h1 {
              font-size: 18px;
              font-weight: 600;
              color: #1d1d1f;
              margin-bottom: 4px;
            }
            
            .header .brand {
              font-size: 12px;
              color: #86868b;
              font-weight: 500;
            }
            
            .main-content {
              display: flex;
              gap: 20px;
              flex: 1;
            }
            
            .left-section {
              width: 60%;
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            
            .right-section {
              width: 40%;
            }
            
            .section {
              border: 1px solid #d1d1d6;
              border-radius: 8px;
              padding: 16px;
              background: #fff;
            }
            
            .section-title {
              font-size: 14px;
              font-weight: 600;
              color: #1d1d1f;
              margin-bottom: 12px;
              padding-bottom: 6px;
              border-bottom: 1px solid #f2f2f7;
            }
            
            .project-input {
              width: 100%;
              min-height: 60px;
              padding: 8px;
              border: 1px solid #d1d1d6;
              border-radius: 6px;
              font-size: 11px;
              line-height: 1.4;
              resize: none;
              background: #fafafa;
            }
            
            .content-input {
              width: 100%;
              min-height: 200px;
              padding: 8px;
              border: 1px solid #d1d1d6;
              border-radius: 6px;
              font-size: 11px;
              line-height: 1.4;
              resize: none;
              background: #fafafa;
            }
            
            .qa-list {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            
            .qa-item {
              padding: 8px;
              border: 1px solid #e5e5e5;
              border-radius: 6px;
              background: #fafafa;
            }
            
            .qa-question {
              font-weight: 500;
              color: #1d1d1f;
              margin-bottom: 4px;
              font-size: 10px;
            }
            
            .qa-answer {
              color: #515154;
              font-size: 10px;
              line-height: 1.3;
            }
            
            .qa-input {
              width: 100%;
              padding: 4px 6px;
              border: 1px solid #d1d1d6;
              border-radius: 4px;
              font-size: 10px;
              line-height: 1.3;
              background: #fff;
              min-height: 32px;
            }
          </style>
        </head>
        <body>
          ${contentRef.current.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="w-full h-full bg-white">
      {/* 컨트롤 패널 */}
      <div className="flex justify-between items-center p-4 border-b bg-gray-50">
        <h2 className="text-lg font-semibold">ARO 지식 정리 템플릿</h2>
        <div className="flex gap-2">
          <Button onClick={generatePDF} size="sm">
            PDF 다운로드
          </Button>
          <Button onClick={printDocument} size="sm" variant="outline">
            인쇄
          </Button>
        </div>
      </div>

      {/* 템플릿 내용 */}
      <div className="p-4 overflow-auto">
        <div 
          ref={contentRef}
          className="print-container"
          style={{
            width: '100%',
            maxWidth: '297mm', // A4 landscape width
            margin: '0 auto',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
            fontSize: '11px',
            lineHeight: '1.4',
            color: '#000',
            background: '#fff',
            minHeight: '210mm', // A4 landscape height
            border: '1px solid #d1d1d6',
            borderRadius: '8px',
            padding: '16px',
            pageBreakInside: 'avoid'
          }}
        >
          {/* 헤더 */}
          <div style={{
            textAlign: 'center',
            borderBottom: '1px solid #e5e5e5',
            paddingBottom: '12px',
            marginBottom: '16px'
          }}>
            <Input
              value={data.title}
              onChange={(e) => updateTitle(e.target.value)}
              className="text-center border-none text-lg font-semibold bg-transparent"
              placeholder="제목을 입력하세요"
            />
            <div style={{ fontSize: '12px', color: '#86868b', fontWeight: '500', marginTop: '4px' }}>
              Made By ARO
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div style={{ display: 'flex', gap: '20px', flex: '1' }}>
            {/* 좌측 섹션 (60%) */}
            <div style={{ width: '60%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Project 섹션 */}
              <div style={{
                border: '1px solid #d1d1d6',
                borderRadius: '8px',
                padding: '16px',
                background: '#fff'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1d1d1f',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid #f2f2f7'
                }}>
                  Project
                </h3>
                <Textarea
                  value={data.project}
                  onChange={(e) => updateProject(e.target.value)}
                  placeholder="프로젝트 내용을 입력하세요"
                  className="w-full min-h-[60px] text-sm border-gray-300 bg-gray-50"
                />
              </div>

              {/* Content 섹션 */}
              <div style={{
                border: '1px solid #d1d1d6',
                borderRadius: '8px',
                padding: '16px',
                background: '#fff',
                flex: '1'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1d1d1f',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid #f2f2f7'
                }}>
                  Content
                </h3>
                <Textarea
                  value={data.content}
                  onChange={(e) => updateContent(e.target.value)}
                  placeholder="학습 내용을 입력하세요"
                  className="w-full min-h-[240px] text-sm border-gray-300 bg-gray-50"
                />
              </div>
            </div>

            {/* 우측 섹션 (40%) */}
            <div style={{ width: '40%' }}>
              <div style={{
                border: '1px solid #d1d1d6',
                borderRadius: '8px',
                padding: '16px',
                background: '#fff',
                height: '100%'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1d1d1f',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid #f2f2f7'
                }}>
                  Q&A
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.qaItems.map((item, index) => (
                    <div key={item.id} style={{
                      padding: '8px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      background: '#fafafa'
                    }}>
                      <div style={{ marginBottom: '4px' }}>
                        <strong style={{ fontSize: '10px', color: '#1d1d1f' }}>Q{index + 1}:</strong>
                        <Input
                          value={item.question}
                          onChange={(e) => updateQAItem(index, 'question', e.target.value)}
                          placeholder="질문을 입력하세요"
                          className="mt-1 text-xs border-gray-300 bg-white min-h-[28px]"
                        />
                      </div>
                      <div>
                        <strong style={{ fontSize: '10px', color: '#515154' }}>A:</strong>
                        <Textarea
                          value={item.answer}
                          onChange={(e) => updateQAItem(index, 'answer', e.target.value)}
                          placeholder="답변을 입력하세요"
                          className="mt-1 text-xs border-gray-300 bg-white min-h-[40px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .print-container {
          min-height: 210mm !important;
          page-break-inside: avoid;
          box-sizing: border-box;
        }
        
        @media print {
          @page {
            size: A4 landscape;
            margin: 0.5in;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .print-container {
            width: 100% !important;
            height: 210mm !important;
            page-break-inside: avoid;
            page-break-after: always;
            border: 1px solid #d1d1d6 !important;
            margin-bottom: 20mm;
          }
          
          .print-container:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default AROTemplate;