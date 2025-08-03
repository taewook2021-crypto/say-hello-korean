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

// HTML 템플릿 생성 함수
const createPrintableHTML = (notes: WrongNote[], subject: string, book: string, chapter: string): string => {
  const notesHTML = notes.map((note, index) => `
    <div class="note-item" style="margin-bottom: 30px; page-break-inside: avoid;">
      <div style="background: #f0f8ff; padding: 15px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ddd;">
        <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px; font-weight: bold;">문제 ${index + 1}</h3>
        <p style="margin: 0; line-height: 1.6; color: #444;">${note.question}</p>
      </div>
      
      <div style="background: #f0fff0; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ddd;">
        <strong style="color: #2d5a27;">정답:</strong> <span style="color: #2d5a27;">${note.correctAnswer}</span>
      </div>
      
      ${note.explanation ? `
        <div style="background: #f8f8f8; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ddd;">
          <strong style="color: #555;">해설:</strong> 
          <p style="margin: 8px 0 0 0; line-height: 1.6; color: #666;">${note.explanation}</p>
        </div>
      ` : ''}
      
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: #888; margin-top: 10px;">
        <span>작성일: ${note.createdAt.toLocaleDateString('ko-KR')}</span>
        <span>상태: ${note.isResolved ? '해결완료' : '미해결'}</span>
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>오답노트</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
        
        body {
          font-family: 'Noto Sans KR', sans-serif;
          max-width: 210mm;
          margin: 0 auto;
          padding: 20mm;
          background: white;
          color: #333;
          line-height: 1.6;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 2px solid #333;
        }
        
        .header h1 {
          margin: 0 0 20px 0;
          font-size: 32px;
          font-weight: 700;
          color: #333;
        }
        
        .header-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 20px;
          text-align: left;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .header-info div {
          padding: 8px 0;
          font-size: 16px;
        }
        
        .header-info strong {
          font-weight: 500;
          color: #555;
        }
        
        @media print {
          body { margin: 0; padding: 15mm; }
          .note-item { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>오답노트</h1>
        <div class="header-info">
          <div><strong>과목:</strong> ${subject}</div>
          <div><strong>교재:</strong> ${book}</div>
          <div><strong>단원:</strong> ${chapter}</div>
          <div><strong>작성일:</strong> ${new Date().toLocaleDateString('ko-KR')}</div>
          <div><strong>총 문제 수:</strong> ${notes.length}개</div>
        </div>
      </div>
      
      <div class="content">
        ${notesHTML}
      </div>
    </body>
    </html>
  `;
};

export const generatePDF = async (notes: WrongNote[], subject: string, book: string, chapter: string) => {
  // HTML 템플릿 생성
  const htmlContent = createPrintableHTML(notes, subject, book, chapter);
  
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