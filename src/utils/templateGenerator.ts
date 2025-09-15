import { saveAs } from 'file-saver';

interface WrongNote {
  id: string;
  question: string;
  sourceText: string;
  explanation?: string;
  createdAt: Date;
  isResolved: boolean;
}

// HTML 템플릿을 사용한 Word 문서 생성
export const generateWordFromTemplate = async (
  notes: WrongNote[]
) => {
  // HTML 형태의 Word 문서 템플릿 생성
  const htmlContent = `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head>
      <meta charset="UTF-8">
      <title>오답노트</title>
      <style>
        body {
          font-family: '맑은 고딕', 'Malgun Gothic', sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .header h1 {
          font-size: 16pt;
          font-weight: bold;
          margin: 0 0 10px 0;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          table-layout: fixed;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 8px;
          vertical-align: top;
          text-align: left;
          word-wrap: break-word;
          word-break: keep-all;
          overflow-wrap: break-word;
        }
        
        th {
          background-color: #f0f0f0;
          font-weight: bold;
          text-align: center;
          font-size: 10pt;
        }
        
        .col-question {
          width: 50%;
        }
        
        .col-source {
          width: 25%;
        }
        
        .col-explanation {
          width: 25%;
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 9pt;
          color: #666;
        }
        
        .content-cell {
          white-space: pre-wrap;
          min-height: 40px;
        }
        
        /* 페이지 브레이크 방지 */
        tr {
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CPA _ ARO : Archive Remind Output</h1>
      </div>
      
      <table>
        <thead>
          <tr>
            <th class="col-question">문제</th>
            <th class="col-source">근거 규정</th>
            <th class="col-explanation">해설</th>
          </tr>
        </thead>
        <tbody>
          ${notes.map((note, index) => `
            <tr>
              <td class="col-question content-cell">${note.question}</td>
              <td class="col-source content-cell">${note.sourceText}</td>
              <td class="col-explanation content-cell">${note.explanation || '해설 없음'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Designed by ARO</p>
      </div>
    </body>
    </html>
  `;

  // HTML을 Word 형식으로 변환하여 다운로드
  const fileName = `오답노트_${new Date().toISOString().split('T')[0]}.doc`;
  
  const blob = new Blob([htmlContent], {
    type: 'application/msword'
  });
  
  saveAs(blob, fileName);
  
  return fileName;
};

// PDF 생성 함수
export const generatePdfFromTemplate = async (
  notes: WrongNote[]
) => {
  try {
    // 동적 import로 html2pdf 로드
    const html2pdf = (await import('html2pdf.js')).default;
    
    // HTML 콘텐츠 생성
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
            font-size: 11px;
            line-height: 1.4;
            color: #333;
            background: white;
            padding: 15px;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding: 15px 0;
            border-bottom: 2px solid #333;
          }
          
          .header h1 {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 5px;
          }
          
          .header p {
            font-size: 9px;
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
            padding: 6px;
            vertical-align: top;
            text-align: left;
            word-wrap: break-word;
            word-break: keep-all;
            overflow-wrap: break-word;
            white-space: pre-wrap;
          }
          
          th {
            background-color: #f5f5f5;
            font-weight: 500;
            text-align: center;
            font-size: 10px;
          }
          
          .col-question {
            width: 50%;
          }
          
          .col-source {
            width: 25%;
          }
          
          .col-explanation {
            width: 25%;
          }
          
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #ccc;
            font-size: 9px;
            color: #666;
          }
          
          .content-cell {
            max-height: none;
            min-height: 30px;
          }
          
          /* 페이지 브레이크 방지 */
          tr {
            page-break-inside: avoid;
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
          <h1>CPA _ ARO : Archive Remind Output</h1>
          <p>생성일: ${new Date().toLocaleDateString('ko-KR')} | 총 ${notes.length}개 문항</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th class="col-question">문제</th>
              <th class="col-source">근거 규정</th>
              <th class="col-explanation">해설</th>
            </tr>
          </thead>
          <tbody>
            ${notes.map((note, index) => `
              <tr>
                <td class="col-question content-cell">${note.question}</td>
                <td class="col-source content-cell">${note.sourceText}</td>
                <td class="col-explanation content-cell">${note.explanation || '해설 없음'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Designed by ARO</p>
        </div>
      </body>
      </html>
    `;

    // PDF 생성 옵션
    const fileName = `오답노트_${new Date().toISOString().split('T')[0]}.pdf`;
    
    const options = {
      margin: [0.4, 0.4, 0.4, 0.4],
      filename: fileName,
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
    
    return fileName;
    
  } catch (error) {
    console.error('PDF 생성 중 오류:', error);
    throw error;
  }
};