import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Minus, Download, Printer, Save, FolderOpen } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface StudyItem {
  id: string;
  title: string;
  content: string;
}

interface QAItem {
  id: string;
  question: string;
  answer: string;
}

interface StudySummaryData {
  title: string;
  date: string;
  subject: string;
  studyItems: StudyItem[];
  qaItems: QAItem[];
}

const StudySummaryTemplate: React.FC = () => {
  const [data, setData] = useState<StudySummaryData>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    subject: '',
    studyItems: [{ id: '1', title: '', content: '' }],
    qaItems: [{ id: '1', question: '', answer: '' }]
  });

  const updateHeader = useCallback((field: keyof Pick<StudySummaryData, 'title' | 'date' | 'subject'>, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  const addStudyItem = useCallback(() => {
    const newItem: StudyItem = {
      id: Date.now().toString(),
      title: '',
      content: ''
    };
    setData(prev => ({ ...prev, studyItems: [...prev.studyItems, newItem] }));
  }, []);

  const removeStudyItem = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      studyItems: prev.studyItems.filter(item => item.id !== id)
    }));
  }, []);

  const updateStudyItem = useCallback((id: string, field: keyof StudyItem, value: string) => {
    setData(prev => ({
      ...prev,
      studyItems: prev.studyItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  }, []);

  const addQAItem = useCallback(() => {
    const newItem: QAItem = {
      id: Date.now().toString(),
      question: '',
      answer: ''
    };
    setData(prev => ({ ...prev, qaItems: [...prev.qaItems, newItem] }));
  }, []);

  const removeQAItem = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      qaItems: prev.qaItems.filter(item => item.id !== id)
    }));
  }, []);

  const updateQAItem = useCallback((id: string, field: keyof QAItem, value: string) => {
    setData(prev => ({
      ...prev,
      qaItems: prev.qaItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  }, []);

  const generatePDF = useCallback(async () => {
    const element = document.getElementById('study-summary-content');
    if (!element) return;

    const opt = {
      margin: 0.5,
      filename: `${data.title || '학습정리'}_${data.date}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF 생성 중 오류 발생:', error);
    }
  }, [data.title, data.date]);

  const printDocument = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const element = document.getElementById('study-summary-content');
    if (!element) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${data.title || '학습정리'}</title>
          <style>
            @page { 
              size: A4 landscape; 
              margin: 0.5in; 
            }
            body { 
              font-family: "Malgun Gothic", "맑은 고딕", sans-serif; 
              margin: 0; 
              padding: 0; 
              background: white;
            }
            .print-content { 
              width: 100%; 
              height: 100vh; 
            }
            ${getInlinePrintStyles()}
          </style>
        </head>
        <body>
          <div class="print-content">
            ${element.innerHTML}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [data.title]);

  const saveData = useCallback(() => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.title || '학습정리'}_${data.date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const loadData = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const loadedData = JSON.parse(e.target?.result as string);
        setData(loadedData);
      } catch (error) {
        console.error('파일 로드 중 오류 발생:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  const getInlinePrintStyles = () => `
    .study-summary-container {
      width: 100%;
      height: 100%;
      background: white;
      padding: 20px;
      box-sizing: border-box;
      font-family: "Malgun Gothic", "맑은 고딕", sans-serif;
      font-size: 12px;
      line-height: 1.4;
    }
    .header-section {
      border: 2px solid black;
      padding: 15px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-title {
      font-size: 18px;
      font-weight: bold;
      flex: 1;
    }
    .header-info {
      display: flex;
      gap: 20px;
      font-size: 14px;
    }
    .content-grid {
      display: flex;
      gap: 15px;
      height: calc(100% - 100px);
    }
    .study-section {
      flex: 0 0 60%;
      border: 2px solid black;
      padding: 15px;
      overflow: hidden;
    }
    .qa-section {
      flex: 0 0 calc(40% - 15px);
      border: 2px solid black;
      padding: 15px;
      overflow: hidden;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid black;
    }
    .study-item {
      margin-bottom: 15px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 10px;
    }
    .study-item:last-child {
      border-bottom: none;
    }
    .study-item-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .study-item-content {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .qa-item {
      margin-bottom: 15px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 10px;
    }
    .qa-item:last-child {
      border-bottom: none;
    }
    .qa-question {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .qa-question::before {
      content: "Q: ";
      color: black;
    }
    .qa-answer {
      margin-left: 10px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .qa-answer::before {
      content: "A: ";
      font-weight: bold;
      color: black;
    }
  `;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
      {/* Control Panel */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2">
              <Button onClick={generatePDF} variant="default" size="sm">
                <Download className="w-4 h-4 mr-2" />
                PDF 다운로드
              </Button>
              <Button onClick={printDocument} variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                인쇄
              </Button>
              <Button onClick={saveData} variant="outline" size="sm">
                <Save className="w-4 h-4 mr-2" />
                저장
              </Button>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    불러오기
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={loadData}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Content */}
      <div 
        id="study-summary-content" 
        className="study-summary-container bg-white border-2 border-gray-300 p-5 shadow-lg"
        style={{ 
          width: '1123px', 
          height: '794px', 
          fontFamily: '"Malgun Gothic", "맑은 고딕", sans-serif',
          fontSize: '12px',
          lineHeight: '1.4'
        }}
      >
        {/* Header */}
        <div className="header-section border-2 border-black p-4 mb-4 flex justify-between items-center">
          <div className="header-title flex-1">
            <Input
              value={data.title}
              onChange={(e) => updateHeader('title', e.target.value)}
              placeholder="학습 제목을 입력하세요"
              className="text-lg font-bold border-none p-0 bg-transparent"
              style={{ fontSize: '18px' }}
            />
          </div>
          <div className="header-info flex gap-5 text-sm">
            <div>
              <span className="font-semibold">날짜: </span>
              <Input
                type="date"
                value={data.date}
                onChange={(e) => updateHeader('date', e.target.value)}
                className="inline-block w-auto border-none p-0 bg-transparent"
              />
            </div>
            <div>
              <span className="font-semibold">주제: </span>
              <Input
                value={data.subject}
                onChange={(e) => updateHeader('subject', e.target.value)}
                placeholder="주제명"
                className="inline-block w-32 border-none p-0 bg-transparent"
              />
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="content-grid flex gap-4" style={{ height: 'calc(100% - 100px)' }}>
          {/* Study Section (60%) */}
          <div className="study-section border-2 border-black p-4 flex-[0_0_60%] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h2 className="section-title text-base font-bold border-b border-black pb-2">학습 정리본</h2>
              <Button
                onClick={addStudyItem}
                variant="outline"
                size="sm"
                className="flex-shrink-0"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-3 overflow-y-auto" style={{ height: 'calc(100% - 60px)' }}>
              {data.studyItems.map((item, index) => (
                <div key={item.id} className="study-item border-b border-gray-300 pb-3 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <Input
                      value={item.title}
                      onChange={(e) => updateStudyItem(item.id, 'title', e.target.value)}
                      placeholder={`학습 항목 ${index + 1} 제목`}
                      className="font-bold border-none p-0 bg-transparent flex-1"
                    />
                    {data.studyItems.length > 1 && (
                      <Button
                        onClick={() => removeStudyItem(item.id)}
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 ml-2"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={item.content}
                    onChange={(e) => updateStudyItem(item.id, 'content', e.target.value)}
                    placeholder="학습 내용을 입력하세요..."
                    className="min-h-[80px] border-none p-0 bg-transparent resize-none"
                    style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Q&A Section (40%) */}
          <div className="qa-section border-2 border-black p-4 flex-[0_0_calc(40%-16px)] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h2 className="section-title text-base font-bold border-b border-black pb-2">Q&A</h2>
              <Button
                onClick={addQAItem}
                variant="outline"
                size="sm"
                className="flex-shrink-0"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-3 overflow-y-auto" style={{ height: 'calc(100% - 60px)' }}>
              {data.qaItems.map((item, index) => (
                <div key={item.id} className="qa-item border-b border-gray-300 pb-3 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-semibold">Q{index + 1}:</span>
                    {data.qaItems.length > 1 && (
                      <Button
                        onClick={() => removeQAItem(item.id)}
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={item.question}
                    onChange={(e) => updateQAItem(item.id, 'question', e.target.value)}
                    placeholder="질문을 입력하세요..."
                    className="mb-2 min-h-[50px] border-none p-0 bg-transparent resize-none"
                  />
                  <div className="mb-1">
                    <span className="text-sm font-semibold">A{index + 1}:</span>
                  </div>
                  <Textarea
                    value={item.answer}
                    onChange={(e) => updateQAItem(item.id, 'answer', e.target.value)}
                    placeholder="답변을 입력하세요..."
                    className="ml-3 min-h-[50px] border-none p-0 bg-transparent resize-none"
                    style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudySummaryTemplate;