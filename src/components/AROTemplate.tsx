import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useReactToPrint } from 'react-to-print';

interface QAItem {
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

interface AROFormData {
  project: string;
  node: string;
  archive: string;
  content: string;
  qaList: QAItem[];
}

interface AROTemplateProps {
  conversationData?: ConversationData;
}

const AROTemplate: React.FC<AROTemplateProps> = ({ conversationData }) => {
  const [formData, setFormData] = useState<AROFormData>({
    project: '',
    node: '',
    archive: '',
    content: '',
    qaList: Array.from({ length: 20 }, () => ({ question: '', answer: '' }))
  });

  const pdfRef = useRef<HTMLDivElement>(null);

  // 대화 데이터가 변경될 때 자동으로 템플릿에 채우기
  useEffect(() => {
    if (conversationData) {
      setFormData(prev => ({
        ...prev,
        project: conversationData.title || '',
        content: conversationData.summary || conversationData.content || '',
        qaList: prev.qaList.map((item, index) => {
          const qaPair = conversationData.qaPairs[index];
          return qaPair ? {
            question: qaPair.question,
            answer: qaPair.answer
          } : item;
        })
      }));
    }
  }, [conversationData]);

  const updateQA = (index: number, field: 'question' | 'answer', value: string) => {
    const newQaList = [...formData.qaList];
    newQaList[index] = { ...newQaList[index], [field]: value };
    setFormData({ ...formData, qaList: newQaList });
  };

  const handlePrint = useReactToPrint({
    contentRef: pdfRef,
    pageStyle: `
      @page { 
        size: A4 landscape; 
        margin: 0; 
      }
    `
  });

  const generatePDF = () => {
    handlePrint();
  };

  return (
    <div className="w-full h-full bg-white">
      {/* 입력 폼 */}
      <div className="input-form p-4 border-b bg-gray-50 print:hidden">
        <h2 className="text-lg font-semibold mb-4">ARO 지식 정리 템플릿</h2>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project</label>
            <Input
              placeholder="Project"
              value={formData.project}
              onChange={(e) => setFormData({...formData, project: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Node</label>
            <Input
              placeholder="Node"
              value={formData.node}
              onChange={(e) => setFormData({...formData, node: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Archive</label>
            <Input
              placeholder="Archive"
              value={formData.archive}
              onChange={(e) => setFormData({...formData, archive: e.target.value})}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Content</label>
          <Textarea
            placeholder="Content"
            value={formData.content}
            onChange={(e) => setFormData({...formData, content: e.target.value})}
            rows={8}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 max-h-60 overflow-y-auto">
          {formData.qaList.map((qa, index) => (
            <div key={index} className="border p-3 rounded">
              <div className="mb-2">
                <label className="block text-sm font-medium mb-1">Q{index + 1}</label>
                <Input
                  placeholder={`Q${index + 1}`}
                  value={qa.question}
                  onChange={(e) => updateQA(index, 'question', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">A{index + 1}</label>
                <Textarea
                  placeholder={`A${index + 1}`}
                  value={qa.answer}
                  onChange={(e) => updateQA(index, 'answer', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        <Button onClick={generatePDF} className="w-full">PDF 생성</Button>
      </div>

      {/* PDF 템플릿 */}
      <div className="pdf-container p-4 overflow-auto print:p-0">
        <div ref={pdfRef}>
          {/* 첫 번째 페이지 */}
          <div className="pdf-page">
            <div className="page-content">
              {/* Project */}
              <div className="project-column">
                <div className="section-title">Project</div>
                <div className="section-content">
                  {formData.project}
                </div>
              </div>
              
              {/* Content */}
              <div className="content-column">
                <div className="section-title">Content</div>
                <div className="section-content">
                  {formData.content.substring(0, 2000)}
                </div>
              </div>
              
              {/* Q&A */}
              <div className="qa-column">
                <div className="section-title">Q&A</div>
                <div className="qa-content">
                  {formData.qaList.slice(0, 8).map((qa, index) => (
                    <div key={index} className="qa-item">
                      <div className="qa-question">
                        Q{index + 1}: {qa.question}
                      </div>
                      <div className="qa-answer">
                        A{index + 1}: {qa.answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 하단 */}
            <div className="page-footer">
              <div className="footer-left">
                <div>Node: {formData.node}</div>
                <div>Archive: {formData.archive}</div>
              </div>
              <div className="footer-right">Made By ARO</div>
            </div>
          </div>
          
          {/* 두 번째 페이지 */}
          {formData.qaList.slice(8).some(qa => qa.question || qa.answer) && (
            <div className="pdf-page">
              <div className="page-content page-2">
                {/* Content 계속 */}
                <div className="content-column-2">
                  <div className="section-title">Content (계속)</div>
                  <div className="section-content">
                    {formData.content.substring(2000)}
                  </div>
                </div>
                
                {/* Q&A 계속 */}
                <div className="qa-column-2">
                  <div className="section-title">Q&A (계속)</div>
                  <div className="qa-content">
                    {formData.qaList.slice(8, 16).map((qa, index) => (
                      <div key={index + 8} className="qa-item">
                        <div className="qa-question">
                          Q{index + 9}: {qa.question}
                        </div>
                        <div className="qa-answer">
                          A{index + 9}: {qa.answer}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="page-footer">
                <div className="footer-right">Made By ARO</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .pdf-page {
          width: 794px;
          height: 559px;
          border: 1px solid #000;
          margin: 20px auto;
          padding: 20px;
          box-sizing: border-box;
          background: white;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
          page-break-after: always;
        }

        .pdf-page:last-child {
          page-break-after: avoid;
        }

        .page-content {
          flex: 1;
          display: flex;
          gap: 15px;
        }

        .page-2 {
          gap: 15px;
        }

        .project-column {
          width: 15%;
          border: 1px solid #ccc;
          padding: 10px;
          overflow: hidden;
        }

        .content-column {
          width: 45%;
          border: 1px solid #ccc;
          padding: 10px;
          overflow: hidden;
        }

        .content-column-2 {
          width: 60%;
          border: 1px solid #ccc;
          padding: 10px;
          overflow: hidden;
        }

        .qa-column {
          width: 40%;
          border: 1px solid #ccc;
          padding: 10px;
          overflow: hidden;
        }

        .qa-column-2 {
          width: 40%;
          border: 1px solid #ccc;
          padding: 10px;
          overflow: hidden;
        }

        .section-title {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 10px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 5px;
        }

        .section-content {
          font-size: 10px;
          line-height: 1.4;
          overflow: hidden;
        }

        .qa-content {
          max-height: 100%;
          overflow: hidden;
        }

        .qa-item {
          margin-bottom: 8px;
          font-size: 9px;
        }

        .qa-question {
          font-weight: bold;
          margin-bottom: 2px;
        }

        .qa-answer {
          margin-left: 8px;
          margin-bottom: 4px;
        }

        .page-footer {
          display: flex;
          justify-content: space-between;
          margin-top: 15px;
          font-size: 10px;
          height: 30px;
        }

        .footer-left div {
          margin-bottom: 2px;
        }

        .footer-right {
          align-self: flex-end;
        }

        @media print {
          @page { 
            size: A4 landscape; 
            margin: 0; 
          }
          
          body * {
            visibility: hidden;
          }
          
          .pdf-container, .pdf-container * {
            visibility: visible;
          }
          
          .pdf-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
          }

          .pdf-page {
            margin: 0;
            width: 100vw;
            height: 100vh;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default AROTemplate;