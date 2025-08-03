import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface WrongNote {
  id: string;
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  createdAt: Date;
  isResolved: boolean;
}

// HTML 기반으로 정확한 답안지 양식 생성
const createAnswerSheetHTML = (notes: WrongNote[], subject: string, book: string, chapter: string, options = { includeWrongAnswers: true }): string => {
  const linesPerPage = 25;
  let allLines: string[] = [];
  
  // 모든 노트를 줄 단위로 변환
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    
        // 문제 텍스트를 60자씩 정확히 분할
        const maxCharsPerLine = 60;
    const questionParts = [];
    let remainingQuestion = note.question;
    
    while (remainingQuestion.length > 0) {
      if (remainingQuestion.length <= maxCharsPerLine) {
        questionParts.push(remainingQuestion);
        break;
      }
      
      // 정확히 60자씩 분할
      questionParts.push(remainingQuestion.substring(0, maxCharsPerLine));
      remainingQuestion = remainingQuestion.substring(maxCharsPerLine);
    }
    
    // 첫 번째 줄: <Q>와 문제 번호, 문제 첫 부분
    allLines.push(`
      <div class="answer-line">
        <div class="content-area">
          <span class="q-marker">&lt;Q${i + 1}&gt;</span>
          <span class="question">${questionParts[0] || ''}</span>
        </div>
      </div>
    `);
    
    // 문제의 나머지 부분들
    for (let j = 1; j < questionParts.length; j++) {
      allLines.push(`
        <div class="answer-line">
          <div class="content-area">
            <span class="question" style="margin-left: 12mm;">${questionParts[j]}</span>
          </div>
        </div>
      `);
    }
    
    // 오답을 60자씩 분할 (옵션에 따라 포함/제외)
    if (options.includeWrongAnswers) {
      const wrongAnswerParts = [];
      let remainingWrongAnswer = note.wrongAnswer;
      
      while (remainingWrongAnswer.length > 0) {
        if (remainingWrongAnswer.length <= maxCharsPerLine) {
          wrongAnswerParts.push(remainingWrongAnswer);
          break;
        }
        
        wrongAnswerParts.push(remainingWrongAnswer.substring(0, maxCharsPerLine));
        remainingWrongAnswer = remainingWrongAnswer.substring(maxCharsPerLine);
      }
      
      // 첫 번째 오답 줄
      allLines.push(`
        <div class="answer-line">
          <div class="content-area">
            <span class="x-marker">&lt;X&gt;</span>
            <span class="wrong-answer">${wrongAnswerParts[0] || ''}</span>
          </div>
        </div>
      `);
      
      // 오답의 나머지 부분들
      for (let j = 1; j < wrongAnswerParts.length; j++) {
        allLines.push(`
          <div class="answer-line">
            <div class="content-area">
              <span class="wrong-answer" style="margin-left: 12mm;">${wrongAnswerParts[j]}</span>
            </div>
          </div>
        `);
      }
    }
    
    // 정답을 60자씩 분할
    const correctAnswerParts = [];
    let remainingCorrectAnswer = note.correctAnswer;
    
    while (remainingCorrectAnswer.length > 0) {
      if (remainingCorrectAnswer.length <= maxCharsPerLine) {
        correctAnswerParts.push(remainingCorrectAnswer);
        break;
      }
      
      correctAnswerParts.push(remainingCorrectAnswer.substring(0, maxCharsPerLine));
      remainingCorrectAnswer = remainingCorrectAnswer.substring(maxCharsPerLine);
    }
    
    // 첫 번째 정답 줄
    allLines.push(`
      <div class="answer-line">
        <div class="content-area">
          <span class="o-marker">&lt;정답&gt;</span>
          <span class="correct-answer">${correctAnswerParts[0] || ''}</span>
        </div>
      </div>
    `);
    
    // 정답의 나머지 부분들
    for (let j = 1; j < correctAnswerParts.length; j++) {
      allLines.push(`
        <div class="answer-line">
          <div class="content-area">
            <span class="correct-answer" style="margin-left: 12mm;">${correctAnswerParts[j]}</span>
          </div>
        </div>
      `);
    }
  }
  
  const totalPages = Math.ceil(allLines.length / linesPerPage) || 1;
  let pagesHTML = '';
  
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const startIndex = pageNum * linesPerPage;
    const endIndex = Math.min(startIndex + linesPerPage, allLines.length);
    const pageLines = allLines.slice(startIndex, endIndex);
    
    // 페이지를 정확히 25줄로 채우기 (빈 줄 추가)
    while (pageLines.length < linesPerPage) {
      pageLines.push(`
        <div class="answer-line">
          <div class="content-area"></div>
        </div>
      `);
    }
    
    pagesHTML += `
      <div class="page" ${pageNum > 0 ? 'style="page-break-before: always;"' : ''}>
        <div class="header">
          <div class="header-right">(${pageNum + 1}쪽)</div>
        </div>
        
        <div class="answer-sheet">
          ${pageLines.join('')}
        </div>
        
        <div class="footer">
          <div class="footer-left">오답노트</div>
          <div class="footer-center">${subject || ''}-${book || ''}</div>
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
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: white;
          color: #000;
          font-size: 14px;
          line-height: 1.4;
        }
        
        .page {
          width: 210mm;
          height: 297mm;
          margin: 0 auto;
          padding: 20mm;
          position: relative;
          background: white;
          display: flex;
          flex-direction: column;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15mm;
          font-size: 11px;
          font-weight: 400;
        }
        
        .answer-sheet {
          border: 2px solid #000;
          flex: 1;
          padding: 5mm;
          display: flex;
          flex-direction: column;
        }
        
        .answer-line {
          display: flex;
          align-items: flex-end;
          height: calc((100% - 0px) / 25);
          border-bottom: 1px solid #000;
          position: relative;
          padding: 0 0 3px 0;
        }
        
        .answer-line:last-child {
          border-bottom: none;
        }
        
        .line-number {
          width: 8mm;
          text-align: center;
          font-size: 9px;
          color: #666;
          margin-right: 3mm;
          flex-shrink: 0;
        }
        
        .content-area {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 3mm;
          font-size: 13px;
          padding: 1mm 0;
          overflow: hidden;
          line-height: 1.2;
        }
        
        .q-marker {
          color: #000;
          font-weight: bold;
          flex-shrink: 0;
        }
        
        .question {
          flex: 1;
          color: #000;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        .x-marker {
          color: #dc2626;
          font-weight: bold;
          flex-shrink: 0;
        }
        
        .wrong-answer {
          color: #dc2626;
          flex: 1;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        .o-marker {
          color: #2563eb;
          font-weight: bold;
          flex-shrink: 0;
        }
        
        .correct-answer {
          color: #2563eb;
          font-weight: 500;
          flex: 1;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 5mm;
          padding: 3mm 5mm;
          background: #f0f0f0;
          border: 1px solid #000;
          font-size: 10px;
          font-weight: 500;
        }
        
        @media print {
          body { margin: 0; }
          .page { 
            margin: 0; 
            padding: 20mm;
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

export const generatePDF = async (notes: WrongNote[], subject: string, book: string, chapter: string, options = { includeWrongAnswers: true }) => {
  console.log('PDF 생성 시작:', { notes: notes.length, subject, book, chapter, options });
  
  // HTML 템플릿 생성
  const htmlContent = createAnswerSheetHTML(notes, subject, book, chapter, options);
  
  // 임시 iframe 생성 (더 안정적)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('iframe document not accessible');
    
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    
    // 폰트 로딩 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // HTML을 Canvas로 변환 (더 안정적인 설정)
    const canvas = await html2canvas(iframeDoc.body, {
      scale: 1.5,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      width: 794, // A4 width
      height: 1123, // A4 height
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794,
      windowHeight: 1123,
      onclone: (clonedDoc) => {
        // 클론된 문서에서 스타일 강제 적용
        const style = clonedDoc.createElement('style');
        style.textContent = `
          * { font-family: 'Noto Sans KR', sans-serif !important; }
          .q-marker { color: #000 !important; }
          .x-marker { color: #dc2626 !important; }
          .o-marker { color: #2563eb !important; }
          .wrong-answer { color: #dc2626 !important; }
          .correct-answer { color: #2563eb !important; }
        `;
        clonedDoc.head.appendChild(style);
      }
    });

    // PDF 생성
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // 페이지 단위로 분할하여 추가
    let yPosition = 0;
    const pageHeight = 297;
    let pageNum = 0;

    while (yPosition < imgHeight) {
      if (pageNum > 0) {
        pdf.addPage();
      }
      
      const remainingHeight = imgHeight - yPosition;
      const currentPageHeight = Math.min(pageHeight, remainingHeight);
      
      // 해당 페이지 영역만 추출
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = (currentPageHeight * canvas.width) / imgWidth;
      
      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        
        const sourceY = (yPosition * canvas.width) / imgWidth;
        ctx.drawImage(
          canvas,
          0, sourceY, canvas.width, pageCanvas.height,
          0, 0, pageCanvas.width, pageCanvas.height
        );
      }
      
      const pageImageData = pageCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(pageImageData, 'JPEG', 0, 0, imgWidth, currentPageHeight);
      
      yPosition += pageHeight;
      pageNum++;
    }

    console.log('PDF 생성 완료');
    return pdf;
    
  } finally {
    document.body.removeChild(iframe);
  }
};

export const downloadPDF = async (notes: WrongNote[], subject: string, book: string, chapter: string, options = { includeWrongAnswers: true }) => {
  try {
    const pdf = await generatePDF(notes, subject, book, chapter, options);
    const fileName = `오답노트_${subject}_${book}_${chapter}_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '')}.pdf`;
    pdf.save(fileName);
    console.log('PDF 다운로드 완료:', fileName);
    return true;
  } catch (error) {
    console.error('PDF 생성 오류:', error);
    return false;
  }
};

export const printPDF = async (notes: WrongNote[], subject: string, book: string, chapter: string, options = { includeWrongAnswers: true }) => {
  try {
    const pdf = await generatePDF(notes, subject, book, chapter, options);
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    
    const printWindow = window.open(url);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (error) {
    console.error('PDF 인쇄 오류:', error);
    return false;
  }
};