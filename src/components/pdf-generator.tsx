import jsPDF from 'jspdf';

interface WrongNote {
  id: string;
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  createdAt: Date;
  isResolved: boolean;
}

export const generatePDF = async (notes: WrongNote[], subject: string, book: string, chapter: string, options = { includeWrongAnswers: true, paperTemplate: 'lined-paper' }) => {
  console.log('PDF 생성 시작 - Canvas 방식으로 변경:', { notes: notes.length, subject, book, chapter, options });
  
  // Canvas를 사용해서 PDF 생성
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // A4 크기 설정 (300 DPI)
  const dpi = 300;
  const pageWidth = (210 * dpi) / 25.4; // mm to pixels
  const pageHeight = (297 * dpi) / 25.4;
  
  canvas.width = pageWidth;
  canvas.height = pageHeight;
  
  // 배경색 설정
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 폰트 설정 (브라우저에서 지원하는 한글 폰트)
  ctx.font = '48px "Noto Sans KR", "맑은 고딕", Arial, sans-serif';
  ctx.textBaseline = 'top';
  
  const margin = (20 * dpi) / 25.4; // 20mm margin
  const lineHeight = (8 * dpi) / 25.4; // 8mm line height
  const contentX = margin;
  let yPosition = margin + (15 * dpi) / 25.4; // 헤더 여백
  
  // 헤더 그리기
  ctx.fillStyle = '#000000';
  ctx.font = '36px "Noto Sans KR", "맑은 고딕", Arial, sans-serif';
  ctx.fillText('로고', contentX, margin);
  ctx.fillText('(1쪽)', canvas.width - margin - 150, margin);
  
  // 컨텐츠 영역 테두리
  const contentWidth = canvas.width - (margin * 2);
  const contentHeight = canvas.height - yPosition - margin - (10 * dpi) / 25.4;
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.strokeRect(contentX, yPosition, contentWidth, contentHeight);
  
  // 가로줄 그리기 (lined-paper)
  if (options.paperTemplate === 'lined-paper') {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    const linesCount = 25;
    for (let i = 1; i < linesCount; i++) {
      const y = yPosition + (contentHeight / linesCount) * i;
      ctx.beginPath();
      ctx.moveTo(contentX, y);
      ctx.lineTo(contentX + contentWidth, y);
      ctx.stroke();
    }
  }
  
  // 텍스트 작성 시작 위치
  yPosition += (5 * dpi) / 25.4;
  
  // 텍스트를 줄에 맞게 분할하는 함수
  const splitTextToLines = (text: string, maxWidth: number, fontSize: number): string[] => {
    ctx.font = `${fontSize}px "Noto Sans KR", "맑은 고딕", Arial, sans-serif`;
    const lines: string[] = [];
    let currentLine = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = char;
        } else {
          lines.push(char);
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  };
  
  // 각 노트 처리
  const fontSize = 48;
  const maxTextWidth = contentWidth - (20 * dpi) / 25.4; // 양쪽 여백 고려
  
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    
    // 문제 출력
    ctx.fillStyle = '#000000';
    const questionText = `<Q${i + 1}> ${note.question}`;
    const questionLines = splitTextToLines(questionText, maxTextWidth, fontSize);
    
    for (const line of questionLines) {
      ctx.font = `${fontSize}px "Noto Sans KR", "맑은 고딕", Arial, sans-serif`;
      ctx.fillText(line, contentX + 30, yPosition);
      yPosition += lineHeight;
    }
    
    // 오답 출력 (옵션에 따라)
    if (options.includeWrongAnswers) {
      ctx.fillStyle = '#dc2626';
      const wrongText = `<X> ${note.wrongAnswer}`;
      const wrongLines = splitTextToLines(wrongText, maxTextWidth, fontSize);
      
      for (const line of wrongLines) {
        ctx.font = `${fontSize}px "Noto Sans KR", "맑은 고딕", Arial, sans-serif`;
        ctx.fillText(line, contentX + 30, yPosition);
        yPosition += lineHeight;
      }
    }
    
    // 정답 출력
    ctx.fillStyle = '#2563eb';
    const correctText = `<정답> ${note.correctAnswer}`;
    const correctLines = splitTextToLines(correctText, maxTextWidth, fontSize);
    
    for (const line of correctLines) {
      ctx.font = `${fontSize}px "Noto Sans KR", "맑은 고딕", Arial, sans-serif`;
      ctx.fillText(line, contentX + 30, yPosition);
      yPosition += lineHeight;
    }
    
    // 문제 간 여백
    yPosition += lineHeight / 2;
  }
  
  // 푸터 그리기
  const footerY = canvas.height - margin + (5 * dpi) / 25.4;
  ctx.fillStyle = '#000000';
  ctx.font = '30px "Noto Sans KR", "맑은 고딕", Arial, sans-serif';
  ctx.fillText('오답노트', contentX, footerY);
  ctx.fillText(`${subject || ''}-${book || ''}`, canvas.width / 2 - 150, footerY);
  ctx.fillText('학습자료', canvas.width - margin - 150, footerY);
  
  // Canvas를 이미지로 변환 후 PDF에 추가
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  
  console.log('PDF 생성 완료');
  return pdf;
};

export const downloadPDF = async (notes: WrongNote[], subject: string, book: string, chapter: string, options = { includeWrongAnswers: true, paperTemplate: 'lined-paper' }) => {
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

export const printPDF = async (notes: WrongNote[], subject: string, book: string, chapter: string, options = { includeWrongAnswers: true, paperTemplate: 'lined-paper' }) => {
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