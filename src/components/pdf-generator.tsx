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
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  // 한글 폰트 설정
  pdf.setFont('helvetica', 'normal');
  
  // 각 페이지당 25줄로 구성
  const notesPerPage = 25;
  const totalPages = Math.ceil(notes.length / notesPerPage);
  
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    if (pageNum > 0) {
      pdf.addPage();
    }
    
    let yPosition = margin;
    
    // 헤더
    pdf.setFontSize(10);
    pdf.text('답안지 훗면에는 기재하지 말것', margin, yPosition);
    pdf.text(`(${pageNum + 1}쪽)`, pageWidth - margin - 20, yPosition);
    yPosition += 15;
    
    // 답안지 테두리
    pdf.setLineWidth(1);
    pdf.rect(margin, yPosition, contentWidth, pageHeight - yPosition - 30);
    
    yPosition += 10;
    const startIndex = pageNum * notesPerPage;
    const endIndex = Math.min(startIndex + notesPerPage, notes.length);
    const pageNotes = notes.slice(startIndex, endIndex);
    
    // 각 줄 그리기
    for (let i = 0; i < notesPerPage; i++) {
      const lineNumber = startIndex + i + 1;
      const note = pageNotes[i];
      
      // 줄 구분선
      if (i > 0) {
        pdf.setLineWidth(0.2);
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin + 5, yPosition, pageWidth - margin - 5, yPosition);
      }
      
      yPosition += 2;
      
      // 줄 번호
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(lineNumber.toString(), margin + 2, yPosition + 4);
      
      // 내용이 있는 경우
      if (note) {
        let xPosition = margin + 15;
        
        // Q 마커와 문제
        pdf.setFontSize(9);
        pdf.setTextColor(37, 99, 235); // 파란색
        pdf.text('<Q>', xPosition, yPosition + 4);
        xPosition += 10;
        
        pdf.setTextColor(0, 0, 0);
        const questionText = pdf.splitTextToSize(note.question, 80);
        pdf.text(questionText[0] || '', xPosition, yPosition + 4);
        xPosition += 85;
        
        // X 마커와 오답
        pdf.setTextColor(220, 38, 38); // 빨간색
        pdf.text('<X>', xPosition, yPosition + 4);
        xPosition += 10;
        
        pdf.text(note.wrongAnswer, xPosition, yPosition + 4);
        xPosition += 25;
        
        // O 마커와 정답
        pdf.setTextColor(22, 163, 74); // 초록색
        pdf.text('<O>', xPosition, yPosition + 4);
        xPosition += 10;
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(note.correctAnswer, xPosition, yPosition + 4);
        pdf.setFont('helvetica', 'normal');
      }
      
      yPosition += 8;
    }
    
    // 푸터
    const footerY = pageHeight - 20;
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, footerY, contentWidth, 15, 'F');
    pdf.rect(margin, footerY, contentWidth, 15, 'S');
    
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text('오답노트', margin + 5, footerY + 10);
    pdf.text(`${subject} - ${book}`, pageWidth / 2 - 20, footerY + 10);
    pdf.text('학습자료', pageWidth - margin - 25, footerY + 10);
    
    // 색상 리셋
    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(0, 0, 0);
  }
  
  return pdf;
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