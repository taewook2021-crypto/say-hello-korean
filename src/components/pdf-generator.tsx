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
  console.log('PDF 생성 시작 - 정확한 줄 배치:', { notes: notes.length, subject, book, chapter, options });
  
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
  
  const margin = (20 * dpi) / 25.4; // 20mm margin
  const contentX = margin;
  const headerHeight = (15 * dpi) / 25.4; // 헤더 여백
  const contentYStart = margin + headerHeight;
  const contentWidth = canvas.width - (margin * 2);
  const contentHeight = canvas.height - contentYStart - margin - (10 * dpi) / 25.4;
  
  // 헤더 그리기
  ctx.fillStyle = '#000000';
  ctx.font = '36px "Noto Sans KR", "맑은 고딕", Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('로고', contentX, margin);
  ctx.fillText('(1쪽)', canvas.width - margin - 150, margin);
  
  // 컨텐츠 영역 테두리
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.strokeRect(contentX, contentYStart, contentWidth, contentHeight);
  
  // 25개 가로줄 그리기 및 위치 계산
  const linesCount = 25;
  const linePositions: number[] = [];
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  
  for (let i = 1; i < linesCount; i++) {
    const y = contentYStart + (contentHeight / linesCount) * i;
    linePositions.push(y);
    ctx.beginPath();
    ctx.moveTo(contentX, y);
    ctx.lineTo(contentX + contentWidth, y);
    ctx.stroke();
  }
  
  // 첫 번째 줄 위치도 추가 (맨 위)
  linePositions.unshift(contentYStart + (contentHeight / linesCount) * 0.5);
  
  // 텍스트를 한 줄에 맞게 자르는 함수
  const fitTextToLine = (text: string, maxWidth: number, fontSize: number): string => {
    ctx.font = `${fontSize}px "Noto Sans KR", "맑은 고딕", Arial, sans-serif`;
    
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    
    // 텍스트가 너무 길면 자르기
    let fittedText = '';
    for (let i = 0; i < text.length; i++) {
      const testText = text.substring(0, i + 1);
      if (ctx.measureText(testText).width > maxWidth) {
        break;
      }
      fittedText = testText;
    }
    
    return fittedText + (fittedText.length < text.length ? '...' : '');
  };
  
  // 모든 텍스트 라인을 준비
  const allTextLines: Array<{text: string, color: string, prefix: string}> = [];
  
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    
    // 문제 추가
    allTextLines.push({
      text: note.question,
      color: '#000000',
      prefix: `<Q${i + 1}>`
    });
    
    // 오답 추가 (옵션에 따라)
    if (options.includeWrongAnswers) {
      allTextLines.push({
        text: note.wrongAnswer,
        color: '#dc2626',
        prefix: '<X>'
      });
    }
    
    // 정답 추가
    allTextLines.push({
      text: note.correctAnswer,
      color: '#2563eb',
      prefix: '<정답>'
    });
    
    // 문제 간 빈 줄 (마지막 문제 제외)
    if (i < notes.length - 1) {
      allTextLines.push({
        text: '',
        color: '#000000',
        prefix: ''
      });
    }
  }
  
  // 각 줄에 텍스트 배치 (가로줄 위 0.2mm)
  const fontSize = 48;
  const textOffsetAboveLine = (0.2 * dpi) / 25.4; // 0.2mm를 픽셀로 변환
  const maxTextWidth = contentWidth - (20 * dpi) / 25.4; // 양쪽 여백
  
  ctx.textBaseline = 'bottom'; // 텍스트 기준점을 아래쪽으로
  
  for (let i = 0; i < Math.min(allTextLines.length, linePositions.length); i++) {
    const textData = allTextLines[i];
    const lineY = linePositions[i];
    
    if (textData.text || textData.prefix) {
      ctx.fillStyle = textData.color;
      ctx.font = `${fontSize}px "Noto Sans KR", "맑은 고딕", Arial, sans-serif`;
      
      const fullText = textData.prefix ? `${textData.prefix} ${textData.text}` : textData.text;
      const fittedText = fitTextToLine(fullText, maxTextWidth, fontSize);
      
      // 가로줄 위 0.2mm에 텍스트 배치
      ctx.fillText(fittedText, contentX + 30, lineY - textOffsetAboveLine);
    }
  }
  
  // 푸터 그리기
  const footerY = canvas.height - margin + (5 * dpi) / 25.4;
  ctx.fillStyle = '#000000';
  ctx.font = '30px "Noto Sans KR", "맑은 고딕", Arial, sans-serif';
  ctx.textBaseline = 'top';
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