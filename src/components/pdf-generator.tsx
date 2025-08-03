import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface WrongNote {
  id: string;
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  explanation: string;
  createdAt: Date;
  isResolved: boolean;
}

// HTML 템플릿 생성 함수 (답안지 양식 스타일)
const createAnswerSheetHTML = (notes: WrongNote[], subject: string, book: string, chapter: string): string => {
  // 각 노트를 줄별로 배치하는 로직
  const notesPerPage = 25; // 한 페이지당 25줄
  const totalPages = Math.ceil(notes.length / notesPerPage);
  
  let pagesHTML = '';
  
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const startIndex = pageNum * notesPerPage;
    const endIndex = Math.min(startIndex + notesPerPage, notes.length);
    const pageNotes = notes.slice(startIndex, endIndex);
    
    // 빈 줄로 채우기 (25줄 맞추기)
    const emptyLines = notesPerPage - pageNotes.length;
    
    const linesHTML = pageNotes.map((note, index) => {
      const lineNumber = startIndex + index + 1;
      return `
        <div class="answer-line">
          <span class="line-number">${lineNumber}</span>
          <div class="answer-content">
            <span class="question-marker">&lt;Q&gt;</span>
            <span class="question-text">${note.question}</span>
            <span class="wrong-marker">&lt;X&gt;</span>
            <span class="wrong-answer">${note.wrongAnswer}</span>
            <span class="correct-marker">&lt;O&gt;</span>
            <span class="correct-answer">${note.correctAnswer}</span>
          </div>
        </div>
      `;
    }).join('');
    
    // 빈 줄 추가
    const emptyLinesHTML = Array(emptyLines).fill(0).map((_, index) => {
      const lineNumber = endIndex + index + 1;
      return `
        <div class="answer-line">
          <span class="line-number">${lineNumber}</span>
          <div class="answer-content empty-line"></div>
        </div>
      `;
    }).join('');
    
    pagesHTML += `
      <div class="page" ${pageNum > 0 ? 'style="page-break-before: always;"' : ''}>
        <div class="header">
          <div class="header-left">답안지 훗면에는 기재하지 말것</div>
          <div class="header-right">(${pageNum + 1}쪽)</div>
        </div>
        
        <div class="answer-sheet">
          ${linesHTML}
          ${emptyLinesHTML}
        </div>
        
        <div class="footer">
          <div class="footer-left">오답노트</div>
          <div class="footer-center">${subject} - ${book}</div>
          <div class="footer-right">학습자료</div>
        </div>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>오답노트 답안지</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Noto Sans KR', sans-serif;
          background: white;
          color: #000;
          font-size: 12px;
        }
        
        .page {
          width: 210mm;
          height: 297mm;
          margin: 0 auto;
          padding: 15mm;
          position: relative;
          background: white;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10mm;
          font-size: 11px;
          font-weight: 500;
        }
        
        .answer-sheet {
          border: 2px solid #000;
          min-height: 240mm;
          padding: 5mm;
        }
        
        .answer-line {
          display: flex;
          align-items: flex-start;
          min-height: 8mm;
          border-bottom: 1px solid #ccc;
          padding: 1mm 0;
          position: relative;
        }
        
        .answer-line:last-child {
          border-bottom: none;
        }
        
        .line-number {
          width: 8mm;
          text-align: center;
          font-weight: 500;
          font-size: 10px;
          color: #666;
          margin-right: 2mm;
        }
        
        .answer-content {
          flex: 1;
          display: flex;
          align-items: flex-start;
          gap: 3mm;
          flex-wrap: wrap;
          font-size: 10px;
          line-height: 1.4;
        }
        
        .empty-line {
          height: 6mm;
        }
        
        .question-marker, .wrong-marker, .correct-marker {
          font-weight: bold;
          color: #000;
        }
        
        .question-marker {
          color: #2563eb;
        }
        
        .wrong-marker {
          color: #dc2626;
        }
        
        .correct-marker {
          color: #16a34a;
        }
        
        .question-text {
          flex: 1;
          min-width: 40mm;
          word-break: break-all;
        }
        
        .wrong-answer {
          color: #dc2626;
          min-width: 20mm;
        }
        
        .correct-answer {
          color: #16a34a;
          font-weight: 500;
          min-width: 20mm;
        }
        
        .footer {
          position: absolute;
          bottom: 5mm;
          left: 15mm;
          right: 15mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3mm;
          background: #f5f5f5;
          border: 1px solid #000;
          font-size: 11px;
          font-weight: 500;
        }
        
        @media print {
          body { margin: 0; }
          .page { 
            margin: 0; 
            padding: 15mm;
            page-break-after: always;
          }
          .page:last-child {
            page-break-after: avoid;
          }
        }
      </style>
    </head>
    <body>
      ${pagesHTML}
    </body>
    </html>
  `;
};

export const generatePDF = async (notes: WrongNote[], subject: string, book: string, chapter: string) => {
  // HTML 템플릿 생성
  const htmlContent = createAnswerSheetHTML(notes, subject, book, chapter);
  
  // 임시 DOM 요소 생성
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '-9999px';
  tempDiv.style.width = '210mm';
  tempDiv.style.background = 'white';
  
  document.body.appendChild(tempDiv);

  try {
    // HTML을 Canvas로 변환
    const canvas = await html2canvas(tempDiv.querySelector('body') || tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794, // A4 width in pixels at 96 DPI
      height: undefined // 자동 높이
    });

    // PDF 생성
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let position = 0;
    const pageHeight = 297; // A4 height in mm

    // 페이지별로 이미지 분할
    while (position < imgHeight) {
      const sourceY = (position * canvas.width) / imgWidth;
      const sourceHeight = Math.min((pageHeight * canvas.width) / imgWidth, canvas.height - sourceY);
      
      // 새 캔버스 생성해서 페이지 영역만 복사
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;
      
      const pageCtx = pageCanvas.getContext('2d');
      if (pageCtx) {
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(canvas, 0, -sourceY);
      }
      
      const pageImgData = pageCanvas.toDataURL('image/png');
      
      if (position > 0) {
        pdf.addPage();
      }
      
      pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, Math.min(pageHeight, imgHeight - position));
      position += pageHeight;
    }

    return pdf;
  } finally {
    // 임시 DOM 요소 제거
    document.body.removeChild(tempDiv);
  }
};

export const downloadPDF = async (notes: WrongNote[], subject: string, book: string, chapter: string) => {
  try {
    const pdf = await generatePDF(notes, subject, book, chapter);
    const fileName = `오답노트_${subject}_${book}_${chapter}_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '')}.pdf`;
    pdf.save(fileName);
    return true;
  } catch (error) {
    console.error('PDF 생성 오류:', error);
    return false;
  }
};

export const printPDF = async (notes: WrongNote[], subject: string, book: string, chapter: string) => {
  try {
    const pdf = await generatePDF(notes, subject, book, chapter);
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    
    const printWindow = window.open(url);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    // URL 정리
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (error) {
    console.error('PDF 인쇄 오류:', error);
    return false;
  }
};