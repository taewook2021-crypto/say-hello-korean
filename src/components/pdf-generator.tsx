import jsPDF from 'jspdf';

interface WrongNote {
  id: string;
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  createdAt: Date;
  isResolved: boolean;
}

const generateExcelPDF = async (notes: WrongNote[], subject: string, book: string, chapter: string, options: any) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // HTML을 캔버스로 렌더링하는 함수
  const createExcelPage = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // A4 크기 설정 (300 DPI)
    const dpi = 300;
    const pageWidth = (210 * dpi) / 25.4;
    const pageHeight = (297 * dpi) / 25.4;
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    
    // 배경 설정
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 마진 설정 (12mm)
    const margin = (12 * dpi) / 25.4;
    const tableWidth = pageWidth - (margin * 2);
    const tableHeight = pageHeight - (margin * 2);
    
    // 테이블 외곽 테두리
    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 3;
    ctx.strokeRect(margin, margin, tableWidth, tableHeight);
    
    // 헤더 배경
    const headerHeight = (10 * dpi) / 25.4;
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(margin, margin, tableWidth, headerHeight);
    
    // 헤더 아래 굵은 선
    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(margin, margin + headerHeight);
    ctx.lineTo(margin + tableWidth, margin + headerHeight);
    ctx.stroke();
    
    // 컬럼 너비 계산 (No.: 12%, Question: 52%, Answer: 36%)
    const noWidth = tableWidth * 0.12;
    const questionWidth = tableWidth * 0.52;
    const answerWidth = tableWidth * 0.36;
    
    // 세로 구분선
    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 3;
    
    // No. | Question 구분선
    ctx.beginPath();
    ctx.moveTo(margin + noWidth, margin);
    ctx.lineTo(margin + noWidth, margin + tableHeight);
    ctx.stroke();
    
    // Question | Answer 구분선
    ctx.beginPath();
    ctx.moveTo(margin + noWidth + questionWidth, margin);
    ctx.lineTo(margin + noWidth + questionWidth, margin + tableHeight);
    ctx.stroke();
    
    // 헤더 텍스트
    ctx.fillStyle = '#000000';
    ctx.font = `${(9.5 * dpi) / 25.4}px "Noto Sans KR", "맑은 고딕", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const headerY = margin + headerHeight / 2;
    ctx.fillText('No.', margin + noWidth / 2, headerY);
    ctx.fillText('Question', margin + noWidth + questionWidth / 2, headerY);
    ctx.fillText('Answer', margin + noWidth + questionWidth + answerWidth / 2, headerY);
    
    // 52개 행의 가로선 그리기
    const contentHeight = tableHeight - headerHeight;
    const rowHeight = contentHeight / 52;
    
    ctx.strokeStyle = '#E8EBEF';
    ctx.lineWidth = 1;
    
    for (let i = 1; i <= 52; i++) {
      const y = margin + headerHeight + rowHeight * i;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(margin + tableWidth, y);
      ctx.stroke();
    }
    
    // 마지막 행 아래 굵은 선
    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(margin, margin + tableHeight);
    ctx.lineTo(margin + tableWidth, margin + tableHeight);
    ctx.stroke();
    
    return canvas;
  };
  
  // 페이지 생성 및 PDF에 추가
  const canvas = createExcelPage();
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  
  return pdf;
};

export const generatePDF = async (notes: WrongNote[], subject: string, book: string, chapter: string, options = { includeWrongAnswers: true, paperTemplate: 'lined-paper' }) => {
  if (options.paperTemplate === 'excel-paper') {
    return generateExcelPDF(notes, subject, book, chapter, options);
  }
  console.log('PDF 생성 시작 - 문제 단위 페이지 분할:', { notes: notes.length, subject, book, chapter, options });
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // 텍스트를 여러 줄로 분할하는 함수
  const splitTextToMultipleLines = (text: string, maxWidth: number, fontSize: number, ctx: CanvasRenderingContext2D): string[] => {
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
  
  // 각 문제별로 필요한 줄 수 계산
  const questionGroups: Array<{lines: Array<{text: string, color: string}>, totalLines: number}> = [];
  
  // 임시 캔버스로 텍스트 크기 측정
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  const dpi = 300;
  const pageWidth = (210 * dpi) / 25.4;
  const margin = (20 * dpi) / 25.4;
  const contentWidth = pageWidth - (margin * 2);
  const maxTextWidth = contentWidth - (20 * dpi) / 25.4;
  const fontSize = 48;
  
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const groupLines: Array<{text: string, color: string}> = [];
    
    // 문제 처리
    const questionText = `<Q${i + 1}> ${note.question}`;
    const questionLines = splitTextToMultipleLines(questionText, maxTextWidth, fontSize, tempCtx);
    questionLines.forEach(line => {
      groupLines.push({
        text: line,
        color: '#000000'
      });
    });
    
    // 오답 처리 (옵션에 따라)
    if (options.includeWrongAnswers) {
      const wrongText = `<X> ${note.wrongAnswer}`;
      const wrongLines = splitTextToMultipleLines(wrongText, maxTextWidth, fontSize, tempCtx);
      wrongLines.forEach(line => {
        groupLines.push({
          text: line,
          color: '#dc2626'
        });
      });
    }
    
    // 정답 처리
    const correctText = `<정답> ${note.correctAnswer}`;
    const correctLines = splitTextToMultipleLines(correctText, maxTextWidth, fontSize, tempCtx);
    correctLines.forEach(line => {
      groupLines.push({
        text: line,
        color: '#2563eb'
      });
    });
    
    questionGroups.push({
      lines: groupLines,
      totalLines: groupLines.length
    });
  }
  
  // 페이지별로 문제 그룹 배치
  const linesPerPage = 25;
  let currentPageLines = 0;
  let currentPageGroups: Array<{text: string, color: string}> = [];
  let pageNum = 0;
  
  const renderPage = (pageLines: Array<{text: string, color: string}>, pageNumber: number) => {
    if (pageNumber > 0) {
      pdf.addPage();
    }
    
    // Canvas를 사용해서 페이지 생성
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    const pageHeight = (297 * dpi) / 25.4;
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    
    // 배경색 설정
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const contentX = margin;
    const headerHeight = (15 * dpi) / 25.4;
    const contentYStart = margin + headerHeight;
    const contentHeight = canvas.height - contentYStart - margin - (10 * dpi) / 25.4;
    
    // 헤더 그리기
    ctx.fillStyle = '#000000';
    ctx.font = '36px "Noto Sans KR", "맑은 고딕", Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('로고', contentX, margin);
    ctx.fillText(`(${pageNumber + 1}쪽)`, canvas.width - margin - 150, margin);
    
    // 컨텐츠 영역 테두리
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeRect(contentX, contentYStart, contentWidth, contentHeight);
    
    // 가로줄 그리기
    const lineSpacing = contentHeight / linesPerPage;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    for (let i = 1; i < linesPerPage; i++) {
      const y = contentYStart + lineSpacing * i;
      ctx.beginPath();
      ctx.moveTo(contentX, y);
      ctx.lineTo(contentX + contentWidth, y);
      ctx.stroke();
    }
    
    // 텍스트 위치 계산 (줄과 줄 사이 중간 + 0.2mm 아래)
    const offsetDown = (0.2 * dpi) / 25.4;
    const textPositions: number[] = [];
    for (let i = 0; i < linesPerPage; i++) {
      const lineTopY = contentYStart + lineSpacing * i;
      const lineBottomY = contentYStart + lineSpacing * (i + 1);
      const middleY = (lineTopY + lineBottomY) / 2;
      textPositions.push(middleY + offsetDown);
    }
    
    // 텍스트 배치
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < Math.min(pageLines.length, textPositions.length); i++) {
      const textData = pageLines[i];
      const textY = textPositions[i];
      
      if (textData.text) {
        ctx.fillStyle = textData.color;
        ctx.font = `${fontSize}px "Noto Sans KR", "맑은 고딕", Arial, sans-serif`;
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
  };
  
  // 문제 그룹별로 페이지 배치 결정
  for (let i = 0; i < questionGroups.length; i++) {
    const group = questionGroups[i];
    
    // 현재 페이지에 이 그룹이 들어갈 수 있는지 확인
    const availableLines = linesPerPage - currentPageLines;
    const needsLines = group.totalLines + (i < questionGroups.length - 1 ? 1 : 0); // 마지막이 아니면 빈 줄 추가
    
    if (currentPageLines > 0 && needsLines > availableLines) {
      // 현재 페이지에 안 들어가면 페이지 렌더링하고 새 페이지 시작
      renderPage(currentPageGroups, pageNum);
      pageNum++;
      currentPageGroups = [];
      currentPageLines = 0;
    }
    
    // 현재 그룹을 페이지에 추가
    currentPageGroups.push(...group.lines);
    currentPageLines += group.totalLines;
    
    // 문제 간 빈 줄 추가 (마지막 문제 제외)
    if (i < questionGroups.length - 1) {
      currentPageGroups.push({
        text: '',
        color: '#000000'
      });
      currentPageLines += 1;
    }
  }
  
  // 마지막 페이지 렌더링
  if (currentPageGroups.length > 0) {
    renderPage(currentPageGroups, pageNum);
  }
  
  console.log('PDF 생성 완료 - 총', pageNum + 1, '페이지');
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