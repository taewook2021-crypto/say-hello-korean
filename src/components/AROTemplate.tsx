import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import html2pdf from 'html2pdf.js';

interface QAItem {
  id: string;
  question: string;
  answer: string;
}

interface QAPair {
  question: string;
  answer: string;
  level: string;
  tags?: string[];
}

interface ConversationData {
  title: string;
  content: string;
  summary: string;
  qaPairs: QAPair[];
}

interface AROTemplateData {
  title: string;
  project: string;
  content: string;
  qaItems: QAItem[];
}

interface AROTemplateProps {
  conversationData?: ConversationData;
}

const AROTemplate: React.FC<AROTemplateProps> = ({ conversationData }) => {
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

  // 대화 데이터가 변경될 때 자동으로 템플릿에 채우기
  useEffect(() => {
    if (conversationData) {
      setData(prev => ({
        ...prev,
        title: conversationData.title || 'ARO 지식 정리',
        project: conversationData.title || '',
        content: conversationData.summary || conversationData.content || '',
        qaItems: prev.qaItems.map((item, index) => {
          const qaPair = conversationData.qaPairs[index];
          return qaPair ? {
            id: item.id,
            question: qaPair.question,
            answer: qaPair.answer
          } : item;
        })
      }));
    }
  }, [conversationData]);

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
      margin: 0,
      filename: `${data.title}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 1.5,
        useCORS: true,
        letterRendering: true,
        allowTaint: false,
        width: 794,
        height: 559
      },
      jsPDF: { 
        unit: 'px', 
        format: [794, 559], 
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
    window.print();
  };

  return (
    <div className="w-full h-full bg-white">
      {/* 컨트롤 패널 */}
      <div className="flex justify-between items-center p-4 border-b bg-gray-50 print:hidden">
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
      <div className="p-4 overflow-auto print:p-0">
        <div 
          ref={contentRef}
          className="pdf-page"
        >
          {/* 헤더 섹션 */}
          <div className="header-section">
            <Input
              value={data.title}
              onChange={(e) => updateTitle(e.target.value)}
              className="text-center border-none text-lg font-semibold bg-transparent"
              placeholder="제목을 입력하세요"
            />
            <div className="brand-text">Made By ARO</div>
          </div>

          {/* 컨텐츠 래퍼 */}
          <div className="content-wrapper">
            {/* 좌측 패널 (60%) */}
            <div className="left-panel">
              {/* Project 섹션 */}
              <div className="project-section section">
                <h3 className="section-title">Project</h3>
                <div className="section-content">
                  <Textarea
                    value={data.project}
                    onChange={(e) => updateProject(e.target.value)}
                    placeholder="프로젝트 내용을 입력하세요"
                    className="w-full h-full text-sm border-gray-300 bg-gray-50 resize-none"
                  />
                </div>
              </div>

              {/* Content 섹션 */}
              <div className="content-section section">
                <h3 className="section-title">Content</h3>
                <div className="section-content">
                  <Textarea
                    value={data.content}
                    onChange={(e) => updateContent(e.target.value)}
                    placeholder="학습 내용을 입력하세요"
                    className="w-full h-full text-sm border-gray-300 bg-gray-50 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 우측 패널 (40%) */}
            <div className="right-panel">
              <div className="qa-section section">
                <h3 className="section-title">Q&A</h3>
                <div className="qa-list">
                  {data.qaItems.slice(0, 6).map((item, index) => (
                    <div key={item.id} className="qa-item">
                      <div className="qa-question-wrapper">
                        <strong className="qa-label">Q{index + 1}:</strong>
                        <Input
                          value={item.question}
                          onChange={(e) => updateQAItem(index, 'question', e.target.value)}
                          placeholder="질문을 입력하세요"
                          className="qa-input"
                        />
                      </div>
                      <div className="qa-answer-wrapper">
                        <strong className="qa-label">A:</strong>
                        <Textarea
                          value={item.answer}
                          onChange={(e) => updateQAItem(index, 'answer', e.target.value)}
                          placeholder="답변을 입력하세요"
                          className="qa-textarea"
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
        /* 웹용 스타일 */
        .pdf-page {
          width: 794px;
          height: 559px;
          border: 3px solid #000;
          margin: 20px auto;
          padding: 20px;
          box-sizing: border-box;
          background: white;
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
          font-size: 11px;
          line-height: 1.4;
          color: #000;
          display: flex;
          flex-direction: column;
        }

        .header-section {
          height: 60px;
          text-align: center;
          border-bottom: 1px solid #ccc;
          margin-bottom: 15px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .brand-text {
          font-size: 12px;
          color: #86868b;
          font-weight: 500;
          margin-top: 4px;
        }

        .content-wrapper {
          flex: 1;
          display: flex;
          gap: 15px;
          overflow: hidden;
        }

        .left-panel {
          width: 60%;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .right-panel {
          width: 40%;
          height: 100%;
        }

        .project-section {
          height: 120px;
          flex-shrink: 0;
        }

        .content-section {
          flex: 1;
          overflow: hidden;
        }

        .qa-section {
          height: 100%;
          overflow: hidden;
        }

        .section {
          border: 1px solid #d1d1d6;
          border-radius: 6px;
          padding: 10px;
          background: #fff;
          height: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .section-title {
          font-size: 12px;
          font-weight: 600;
          color: #1d1d1f;
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #f2f2f7;
          flex-shrink: 0;
        }

        .section-content {
          flex: 1;
          overflow: hidden;
        }

        .qa-list {
          height: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .qa-item {
          flex-shrink: 0;
          padding: 4px;
          border: 1px solid #e5e5e5;
          border-radius: 3px;
          background: #fafafa;
          font-size: 8px;
          height: 52px;
          overflow: hidden;
        }

        .qa-question-wrapper {
          margin-bottom: 2px;
        }

        .qa-answer-wrapper {
          display: flex;
          flex-direction: column;
        }

        .qa-label {
          font-size: 9px;
          color: #1d1d1f;
        }

        .qa-input {
          margin-top: 1px;
          font-size: 8px;
          border: 1px solid #d1d1d6;
          background: white;
          height: 20px;
          padding: 2px 4px;
        }

        .qa-textarea {
          margin-top: 1px;
          font-size: 8px;
          border: 1px solid #d1d1d6;
          background: white;
          height: 20px;
          resize: none;
          padding: 2px 4px;
        }

        /* 인쇄용 스타일 */
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          
          body * {
            visibility: hidden;
          }
          
          .pdf-page, .pdf-page * {
            visibility: visible;
          }
          
          .pdf-page {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            border: 3px solid #000 !important;
            padding: 40px !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            background: white !important;
          }

          .header-section {
            height: 80px !important;
            text-align: center !important;
            border-bottom: 2px solid #000 !important;
            margin-bottom: 20px !important;
            flex-shrink: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
          }

          .brand-text {
            font-size: 14px !important;
            color: #000 !important;
            font-weight: 600 !important;
            margin-top: 8px !important;
          }

          .content-wrapper {
            flex: 1 !important;
            display: flex !important;
            gap: 20px !important;
            overflow: hidden !important;
          }

          .left-panel {
            width: 60% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 15px !important;
          }

          .right-panel {
            width: 40% !important;
            height: 100% !important;
          }

          .project-section {
            height: 25% !important;
            flex-shrink: 0 !important;
          }

          .content-section {
            flex: 1 !important;
            overflow: hidden !important;
          }

          .qa-section {
            height: 100% !important;
            overflow: hidden !important;
          }

          .section {
            border: 2px solid #000 !important;
            border-radius: 8px !important;
            padding: 15px !important;
            background: #fff !important;
            height: 100% !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
          }

          .section-title {
            font-size: 16px !important;
            font-weight: 700 !important;
            color: #000 !important;
            margin-bottom: 10px !important;
            padding-bottom: 6px !important;
            border-bottom: 2px solid #000 !important;
            flex-shrink: 0 !important;
          }

          .section-content {
            flex: 1 !important;
            overflow: hidden !important;
          }

          .qa-list {
            height: 100% !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }

          .qa-item {
            flex-shrink: 0 !important;
            padding: 8px !important;
            border: 1px solid #000 !important;
            border-radius: 4px !important;
            background: #f9f9f9 !important;
            font-size: 12px !important;
            height: auto !important;
            min-height: 50px !important;
            overflow: hidden !important;
          }

          .qa-label {
            font-size: 12px !important;
            color: #000 !important;
            font-weight: 600 !important;
          }

          /* 입력 필드들 인쇄 시 텍스트만 보이도록 */
          input, textarea {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            font-size: inherit !important;
            line-height: inherit !important;
            font-family: inherit !important;
            color: #000 !important;
            resize: none !important;
            box-shadow: none !important;
            outline: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AROTemplate;