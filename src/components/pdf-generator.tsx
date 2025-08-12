import jsPDF from 'jspdf';

interface WrongNote {
  id: string;
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  createdAt: Date;
  isResolved: boolean;
}

// 템플릿 클래스 반환 함수
const getTemplateClass = (templateId: string) => {
  switch (templateId) {
    case 'lined-paper':
      return 'lined-template';
    case 'dotted-paper':
      return 'dotted-template';
    case 'grid-paper':
      return 'grid-template';
    case 'cornell-paper':
      return 'cornell-template';
    default:
      return '';
  }
};

// jsPDF 직접 텍스트 배치를 위한 유틸리티 함수들
const splitTextToFitWidth = (text: string, pdf: jsPDF, maxWidth: number, fontSize: number = 12): string[] => {
  pdf.setFontSize(fontSize);
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = pdf.getTextWidth(testLine);
    
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // 단어가 너무 길면 강제로 자르기
        let remainingWord = word;
        while (remainingWord.length > 0) {
          let fitLength = remainingWord.length;
          while (fitLength > 0 && pdf.getTextWidth(remainingWord.substring(0, fitLength)) > maxWidth) {
            fitLength--;
          }
          if (fitLength === 0) fitLength = 1; // 최소 1글자는 넣기
          lines.push(remainingWord.substring(0, fitLength));
          remainingWord = remainingWord.substring(fitLength);
        }
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
};

const drawTemplateBackground = (pdf: jsPDF, paperTemplate: string) => {
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentX = margin;
  const contentY = margin + 15; // 헤더 공간
  const contentWidth = pageWidth - (margin * 2);
  const contentHeight = pageHeight - margin - contentY - 10; // 푸터 공간
  
  // 테두리 그리기
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(contentX, contentY, contentWidth, contentHeight);
  
  switch (paperTemplate) {
    case 'lined-paper':
      // 가로줄 25개 그리기
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.2);
      for (let i = 1; i < 25; i++) {
        const y = contentY + (contentHeight / 25) * i;
        pdf.line(contentX, y, contentX + contentWidth, y);
      }
      break;
      
    case 'dotted-paper':
      // 점선 패턴
      pdf.setDrawColor(102, 102, 102);
      const dotSpacing = 5;
      for (let x = contentX + dotSpacing; x < contentX + contentWidth; x += dotSpacing) {
        for (let y = contentY + dotSpacing; y < contentY + contentHeight; y += dotSpacing) {
          pdf.circle(x, y, 0.2, 'F');
        }
      }
      break;
      
    case 'grid-paper':
      // 격자 패턴
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.1);
      const gridSpacing = 5;
      for (let x = contentX + gridSpacing; x < contentX + contentWidth; x += gridSpacing) {
        pdf.line(x, contentY, x, contentY + contentHeight);
      }
      for (let y = contentY + gridSpacing; y < contentY + contentHeight; y += gridSpacing) {
        pdf.line(contentX, y, contentX + contentWidth, y);
      }
      break;
      
    case 'cornell-paper':
      // 코넬 노트 스타일
      pdf.setDrawColor(220, 38, 38);
      pdf.setLineWidth(0.3);
      
      // 상단 여백선
      pdf.line(contentX, contentY + 15, contentX + contentWidth, contentY + 15);
      
      // 왼쪽 여백선 (노트 구역 분리)
      const leftMargin = contentX + 50;
      pdf.line(leftMargin, contentY, leftMargin, contentY + contentHeight - 25);
      
      // 하단 요약 구역 분리선
      const summaryY = contentY + contentHeight - 25;
      pdf.line(contentX, summaryY, contentX + contentWidth, summaryY);
      
      // 가로줄들 (연한 색상)
      pdf.setDrawColor(220, 38, 38, 0.3);
      pdf.setLineWidth(0.1);
      for (let i = 1; i < 24; i++) {
        const y = contentY + 15 + ((contentHeight - 40) / 24) * i;
        pdf.line(contentX, y, contentX + contentWidth, y);
      }
      break;
  }
};

export const generatePDF = async (notes: WrongNote[], subject: string, book: string, chapter: string, options = { includeWrongAnswers: true, paperTemplate: 'lined-paper' }) => {
  console.log('PDF 생성 시작:', { notes: notes.length, subject, book, chapter, options });
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // 페이지 설정
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentX = margin;
  const contentY = margin + 15; // 헤더 여백
  const contentWidth = pageWidth - (margin * 2);
  const lineHeight = 8; // 줄 간격
  const linesPerPage = 25; // 페이지당 줄 수
  
  let currentPage = 1;
  let currentLine = 1;
  let yPosition = contentY + 5; // 첫 번째 줄 위치
  
  // 첫 페이지 초기화
  const initializePage = (pageNum: number) => {
    // 템플릿 배경 그리기
    drawTemplateBackground(pdf, options.paperTemplate || 'lined-paper');
    
    // 헤더 그리기
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text('로고', contentX, margin + 10);
    pdf.text(`(${pageNum}쪽)`, contentX + contentWidth - 20, margin + 10);
    
    // 푸터 그리기  
    const footerY = pageHeight - margin + 5;
    pdf.setFontSize(9);
    pdf.text('오답노트', contentX, footerY);
    pdf.text(`${subject || ''}-${book || ''}`, contentX + contentWidth/2 - 20, footerY);
    pdf.text('학습자료', contentX + contentWidth - 20, footerY);
  };
  
  const addNewPageIfNeeded = () => {
    if (currentLine > linesPerPage) {
      pdf.addPage();
      currentPage++;
      currentLine = 1;
      yPosition = contentY + 5;
      initializePage(currentPage);
    }
  };
  
  const writeTextOnLine = (text: string, color: [number, number, number] = [0, 0, 0], fontSize: number = 12, prefix: string = '') => {
    addNewPageIfNeeded();
    
    pdf.setFontSize(fontSize);
    pdf.setTextColor(color[0], color[1], color[2]);
    
    const fullText = prefix ? `${prefix} ${text}` : text;
    const maxWidth = contentWidth - 10; // 여백 고려
    
    // 텍스트가 한 줄에 들어가는지 확인
    const textWidth = pdf.getTextWidth(fullText);
    
    if (textWidth <= maxWidth) {
      // 한 줄에 들어감
      pdf.text(fullText, contentX + 5, yPosition);
      currentLine++;
      yPosition += lineHeight;
    } else {
      // 여러 줄로 분할 필요
      const lines = splitTextToFitWidth(fullText, pdf, maxWidth, fontSize);
      
      for (const line of lines) {
        addNewPageIfNeeded();
        pdf.text(line, contentX + 5, yPosition);
        currentLine++;
        yPosition += lineHeight;
      }
    }
  };
  
  // 첫 페이지 초기화
  initializePage(currentPage);
  
  // 각 노트 처리
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    
    // 문제 출력
    writeTextOnLine(note.question, [0, 0, 0], 12, `<Q${i + 1}>`);
    
    // 오답 출력 (옵션에 따라)
    if (options.includeWrongAnswers) {
      writeTextOnLine(note.wrongAnswer, [220, 38, 38], 12, '<X>');
    }
    
    // 정답 출력
    writeTextOnLine(note.correctAnswer, [37, 99, 235], 12, '<정답>');
    
    // 문제 간 여백 (빈 줄 하나 추가)
    if (i < notes.length - 1) {
      currentLine++;
      yPosition += lineHeight;
    }
  }
  
  // 남은 공간을 빈 줄로 채우기
  while (currentLine <= linesPerPage) {
    currentLine++;
    yPosition += lineHeight;
  }
  
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