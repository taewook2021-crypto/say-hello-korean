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
  console.log('PDF 생성 시작 - 다중 페이지 지원:', { notes: notes.length, subject, book, chapter, options });
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // 모든 텍스트 라인을 먼저 준비
  const allTextLines: Array<{text: string, color: string}> = [];
  
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    
    // 문제 처리
    const questionText = `<Q${i + 1}> ${note.question}`;
    allTextLines.push({
      text: questionText,
      color: '#000000'
    });
    
    // 오답 처리 (옵션에 따라)
    if (options.includeWrongAnswers) {
      const wrongText = `<X> ${note.wrongAnswer}`;
      allTextLines.push({
        text: wrongText,
        color: '#dc2626'
      });
    }
    
    // 정답 처리
    const correctText = `<정답> ${note.correctAnswer}`;
    allTextLines.push({
      text: correctText,
      color: '#2563eb'
    });
    
    // 문제 간 빈 줄 (마지막 문제 제외)
    if (i < notes.length - 1) {
      allTextLines.push({
        text: '',
        color: '#000000'
      });
    }
  }
  
  // 페이지별로 처리
  const linesPerPage = 25;
  const totalPages = Math.ceil(allTextLines.length / linesPerPage) || 1;
  
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    if (pageNum > 0) {
      pdf.addPage();
    }
    
    // Canvas를 사용해서 각 페이지 생성
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
    ctx.fillText(`(${pageNum + 1}쪽)`, canvas.width - margin - 150, margin);
    
    // 컨텐츠 영역 테두리
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeRect(contentX, contentYStart, contentWidth, contentHeight);
    
    // 25개 가로줄 그리기 및 줄 사이 중간 위치 계산
    const lineSpacing = contentHeight / linesPerPage;
    const textPositions: number[] = [];
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    // 가로줄 그리기
    for (let i = 1; i < linesPerPage; i++) {
      const y = contentYStart + lineSpacing * i;
      ctx.beginPath();
      ctx.moveTo(contentX, y);
      ctx.lineTo(contentX + contentWidth, y);
      ctx.stroke();
    }
    
    // 각 줄 사이의 중간 위치 + 0.2mm 아래로 계산
    const offsetDown = (0.2 * dpi) / 25.4; // 0.2mm를 픽셀로 변환
    for (let i = 0; i < linesPerPage; i++) {
      const lineTopY = contentYStart + lineSpacing * i;
      const lineBottomY = contentYStart + lineSpacing * (i + 1);
      const middleY = (lineTopY + lineBottomY) / 2;
      textPositions.push(middleY + offsetDown); // 0.2mm 아래로
    }
    
    // 텍스트를 여러 줄로 분할하는 함수 (자르지 않고 다음 줄로)
    const splitTextToMultipleLines = (text: string, maxWidth: number, fontSize: number): string[] => {
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
          // 현재 줄을 완성하고 다음 줄로
          if (currentLine) {
            lines.push(currentLine);
            currentLine = char;
          } else {
            // 단일 문자도 너무 크면 강제로 추가
            lines.push(char);
          }
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    };
    
    // 현재 페이지에 해당하는 텍스트 라인들 가져오기
    const startIndex = pageNum * linesPerPage;
    const endIndex = Math.min(startIndex + linesPerPage, allTextLines.length);
    const pageTextLines = allTextLines.slice(startIndex, endIndex);
    
    // 텍스트 라인들을 실제 줄로 확장 (긴 텍스트는 여러 줄로)
    const expandedLines: Array<{text: string, color: string}> = [];
    const fontSize = 48;
    const maxTextWidth = contentWidth - (20 * dpi) / 25.4; // 양쪽 여백
    
    for (const textData of pageTextLines) {
      if (textData.text) {
        const splitLines = splitTextToMultipleLines(textData.text, maxTextWidth, fontSize);
        splitLines.forEach(line => {
          expandedLines.push({
            text: line,
            color: textData.color
          });
        });
      } else {
        // 빈 줄
        expandedLines.push({
          text: '',
          color: textData.color
        });
      }
    }
    
    // 각 줄에 텍스트 배치 (줄과 줄 사이 중간 + 0.2mm 아래)
    ctx.textBaseline = 'middle'; // 텍스트 기준점을 중간으로
    
    for (let i = 0; i < Math.min(expandedLines.length, textPositions.length); i++) {
      const textData = expandedLines[i];
      const textY = textPositions[i];
      
      if (textData.text) {
        ctx.fillStyle = textData.color;
        ctx.font = `${fontSize}px "Noto Sans KR", "맑은 고딕", Arial, sans-serif`;
        
        // 줄과 줄 사이 중간 + 0.2mm 아래에 텍스트 배치
        ctx.fillText(textData.text, contentX + 30, textY);
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
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  }
  
  console.log('PDF 생성 완료 - 총', totalPages, '페이지');
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