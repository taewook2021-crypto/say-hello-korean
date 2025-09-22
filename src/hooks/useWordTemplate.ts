import { useState } from 'react';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';

interface WrongNote {
  id: string;
  question: string;
  source_text: string;
  explanation?: string;
  subject_name: string;
  book_name: string;
  chapter_name: string;
  created_at: string;
  updated_at: string;
  is_resolved: boolean;
}

interface UseWordTemplateReturn {
  generateWordDocument: (
    notes: WrongNote[],
    templatePath?: string,
    fileName?: string
  ) => Promise<void>;
  generatePdfDocument: (
    notes: WrongNote[],
    fileName?: string
  ) => Promise<void>;
  isGenerating: boolean;
}

export const useWordTemplate = (): UseWordTemplateReturn => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateWordDocument = async (
    notes: WrongNote[],
    templatePath: string = '/templates/template.docx',
    fileName?: string
  ): Promise<void> => {
    if (notes.length === 0) {
      toast.error("문서로 변환할 노트가 없습니다.");
      return;
    }

    setIsGenerating(true);
    
    try {
      // 동적 import로 docx-templates 로드
      const { default: createReport } = await import('docx-templates');
      
      // 템플릿 파일 로드
      const templateResponse = await fetch(templatePath);
      if (!templateResponse.ok) {
        throw new Error('템플릿 파일을 불러올 수 없습니다.');
      }
      
      const templateBuffer = await templateResponse.arrayBuffer();
      
      // 템플릿에 들어갈 데이터 준비 - 표 형태로 정리
      const templateData = {
        rows: notes.map((note, index) => ({
          문제: note.question,
          해설: note.explanation || '해설 없음'
        })),
        generatedDate: new Date().toLocaleDateString('ko-KR'),
        totalCount: notes.length
      };

      // 문서 생성 - 긴 텍스트 보호를 위한 설정
      const report = await createReport({
        template: new Uint8Array(templateBuffer),
        data: templateData,
        cmdDelimiter: ['(', ')'], // 템플릿의 (문제), (근거 규정), (해설) 형태에 맞춤
        failFast: false,
        noSandbox: false,
        additionalJsContext: {
          // 긴 텍스트 처리를 위한 헬퍼 함수
          wrapText: (text: string, maxLength: number = 100) => {
            if (!text || text.length <= maxLength) return text;
            
            // 한글 텍스트의 경우 단어 단위로 줄바꿈
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';
            
            for (const word of words) {
              if ((currentLine + word).length > maxLength) {
                if (currentLine) {
                  lines.push(currentLine.trim());
                  currentLine = word + ' ';
                } else {
                  // 단어 자체가 너무 긴 경우
                  lines.push(word);
                  currentLine = '';
                }
              } else {
                currentLine += word + ' ';
              }
            }
            
            if (currentLine) {
              lines.push(currentLine.trim());
            }
            
            return lines.join('\n');
          }
        }
      });

      // 파일명 생성
      const defaultFileName = `오답노트_${new Date().toISOString().split('T')[0]}.docx`;
      const finalFileName = fileName || defaultFileName;
      
      // 파일 다운로드
      const blob = new Blob([report], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      saveAs(blob, finalFileName);
      
      toast.success(`Word 문서가 생성되었습니다: ${finalFileName}`);
      
    } catch (error) {
      console.error('Word 문서 생성 중 오류:', error);
      toast.error("Word 문서 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePdfDocument = async (
    notes: WrongNote[],
    fileName?: string
  ): Promise<void> => {
    if (notes.length === 0) {
      toast.error("PDF로 변환할 노트가 없습니다.");
      return;
    }

    setIsGenerating(true);
    
    try {
      // 동적 import로 html2pdf 로드
      const html2pdf = (await import('html2pdf.js')).default;
      
      // HTML 템플릿 생성 - 긴 텍스트 보호를 위한 CSS 포함
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>오답노트</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Noto Sans KR', sans-serif;
              font-size: 12px;
              line-height: 1.6;
              color: #333;
              background: white;
            }
            
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding: 20px 0;
              border-bottom: 2px solid #333;
            }
            
            .header h1 {
              font-size: 18px;
              font-weight: 700;
              margin-bottom: 5px;
            }
            
            .header p {
              font-size: 10px;
              color: #666;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              table-layout: fixed;
            }
            
            th, td {
              border: 1px solid #333;
              padding: 8px;
              vertical-align: top;
              text-align: left;
              /* 긴 텍스트 보호를 위한 CSS */
              word-wrap: break-word;
              word-break: keep-all;
              overflow-wrap: break-word;
              white-space: pre-wrap;
            }
            
            th {
              background-color: #f5f5f5;
              font-weight: 500;
              text-align: center;
              padding-top: 4px;
              margin: 0;
            }
            
            th p, th div {
              margin: 0 !important;
              padding: 0 !important;
              margin-top: 0 !important;
              margin-bottom: 0 !important;
            }
            
            .col-question {
              width: 50%;
            }
            
            .col-explanation {
              width: 50%;
            }
            
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ccc;
              font-size: 10px;
              color: #666;
            }
            
            /* 페이지 브레이크 방지 */
            tr {
              page-break-inside: avoid;
            }
            
            /* 긴 셀 내용 처리 */
            .content-cell {
              max-height: none;
              min-height: 40px;
            }
            
            @media print {
              body {
                print-color-adjust: exact;
              }
              
              table {
                page-break-inside: auto;
              }
              
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CPA _ Re:Mind : Archive Remind Output</h1>
            <p>생성일: ${new Date().toLocaleDateString('ko-KR')} | 총 ${notes.length}개 문항</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th class="col-question">문제</th>
                <th class="col-explanation">해설</th>
              </tr>
            </thead>
            <tbody>
              ${notes.map((note, index) => `
                <tr>
                  <td class="col-question content-cell">${note.question}</td>
                  <td class="col-explanation content-cell">${note.explanation || '해설 없음'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Designed by Re:Mind</p>
          </div>
        </body>
        </html>
      `;

      // PDF 생성 옵션 - A4 용지에 최적화
      const options = {
        margin: [0.5, 0.5, 0.5, 0.5], // 인치 단위 여백
        filename: fileName || `오답노트_${new Date().toISOString().split('T')[0]}.pdf`,
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
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // HTML을 임시 엘리먼트에 추가
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);

      // PDF 생성 및 다운로드
      await html2pdf().set(options).from(tempDiv).save();
      
      // 임시 엘리먼트 제거
      document.body.removeChild(tempDiv);
      
      toast.success(`PDF 문서가 생성되었습니다: ${options.filename}`);
      
    } catch (error) {
      console.error('PDF 생성 중 오류:', error);
      toast.error("PDF 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateWordDocument,
    generatePdfDocument,
    isGenerating
  };
};