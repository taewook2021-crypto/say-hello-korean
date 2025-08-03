import jsPDF from 'jspdf';

interface WrongNote {
  id: string;
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  explanation: string;
  createdAt: Date;
  isResolved: boolean;
}

export const generatePDF = async (notes: WrongNote[], subject: string, book: string, chapter: string) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // 한글 폰트 설정 (기본 폰트 사용하되 한글 지원을 위해 다른 방식 사용)
  pdf.setFont('helvetica', 'normal');
  
  // 각 페이지당 25줄로 구성
  const notesPerPage = 25;
  const totalPages = Math.ceil(notes.length / notesPerPage) || 1;
  
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    if (pageNum > 0) {
      pdf.addPage();
    }
    
    let yPosition = margin;
    
    // 상단 헤더
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text('답안지 훗면에는 기재하지 말것', margin, yPosition);
    pdf.text(`(${pageNum + 1}쪽)`, pageWidth - margin - 15, yPosition);
    yPosition += 15;
    
    // 메인 테두리 (두꺼운 선)
    pdf.setLineWidth(1.5);
    pdf.setDrawColor(0, 0, 0);
    const boxHeight = pageHeight - yPosition - 40;
    pdf.rect(margin, yPosition, contentWidth, boxHeight);
    
    // 내부 여백
    const innerMargin = 5;
    const lineHeight = (boxHeight - innerMargin * 2) / notesPerPage;
    
    yPosition += innerMargin;
    
    const startIndex = pageNum * notesPerPage;
    const endIndex = Math.min(startIndex + notesPerPage, notes.length);
    const pageNotes = notes.slice(startIndex, endIndex);
    
    // 25줄 그리기
    for (let i = 0; i < notesPerPage; i++) {
      const currentY = yPosition + (i * lineHeight);
      const note = pageNotes[i];
      
      // 가로 점선 (각 줄)
      pdf.setLineWidth(0.3);
      pdf.setDrawColor(150, 150, 150);
      
      // 점선 그리기
      const dashLength = 2;
      const gapLength = 2;
      for (let x = margin + innerMargin; x < pageWidth - margin - innerMargin; x += dashLength + gapLength) {
        pdf.line(x, currentY + lineHeight - 2, Math.min(x + dashLength, pageWidth - margin - innerMargin), currentY + lineHeight - 2);
      }
      
      // 줄 번호 (왼쪽)
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text((startIndex + i + 1).toString(), margin + 2, currentY + lineHeight / 2 + 2);
      
      // 내용이 있는 경우 작성
      if (note) {
        let xPos = margin + 12;
        const textY = currentY + lineHeight / 2 + 2;
        
        pdf.setFontSize(9);
        
        // <Q> 마커 (파란색)
        pdf.setTextColor(50, 50, 200);
        pdf.text('<Q>', xPos, textY);
        xPos += 12;
        
        // 문제 내용 (검은색, 길면 자르기)
        pdf.setTextColor(0, 0, 0);
        const maxQuestionWidth = 65;
        let questionText = note.question;
        if (pdf.getTextWidth(questionText) > maxQuestionWidth) {
          while (pdf.getTextWidth(questionText + '...') > maxQuestionWidth && questionText.length > 1) {
            questionText = questionText.slice(0, -1);
          }
          questionText += '...';
        }
        pdf.text(questionText, xPos, textY);
        xPos += maxQuestionWidth + 5;
        
        // <X> 마커 (빨간색)
        pdf.setTextColor(200, 50, 50);
        pdf.text('<X>', xPos, textY);
        xPos += 12;
        
        // 오답 (빨간색)
        pdf.text(note.wrongAnswer.length > 15 ? note.wrongAnswer.substring(0, 15) + '...' : note.wrongAnswer, xPos, textY);
        xPos += 25;
        
        // <O> 마커 (초록색)
        pdf.setTextColor(50, 150, 50);
        pdf.text('<O>', xPos, textY);
        xPos += 12;
        
        // 정답 (초록색, 굵게)
        pdf.setFont('helvetica', 'bold');
        pdf.text(note.correctAnswer.length > 15 ? note.correctAnswer.substring(0, 15) + '...' : note.correctAnswer, xPos, textY);
        pdf.setFont('helvetica', 'normal');
      }
    }
    
    // 하단 푸터 박스
    const footerY = pageHeight - 25;
    pdf.setFillColor(240, 240, 240);
    pdf.setLineWidth(1);
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(margin, footerY, contentWidth, 15, 'FD');
    
    // 푸터 텍스트
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text('오답노트', margin + 5, footerY + 10);
    
    // 가운데 텍스트 (과목-교재)
    const centerText = `${subject || ''}-${book || ''}`.substring(0, 20);
    const centerX = pageWidth / 2 - pdf.getTextWidth(centerText) / 2;
    pdf.text(centerText, centerX, footerY + 10);
    
    pdf.text('학습자료', pageWidth - margin - 25, footerY + 10);
    
    // 색상 및 설정 리셋
    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
  }
  
  return pdf;
};

export const downloadPDF = async (notes: WrongNote[], subject: string, book: string, chapter: string) => {
  try {
    console.log('PDF 생성 시작:', { notes: notes.length, subject, book, chapter });
    const pdf = await generatePDF(notes, subject, book, chapter);
    const fileName = `오답노트_${subject}_${book}_${chapter}_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '')}.pdf`;
    pdf.save(fileName);
    console.log('PDF 다운로드 완료:', fileName);
    return true;
  } catch (error) {
    console.error('PDF 생성 오류:', error);
    return false;
  }
};

export const printPDF = async (notes: WrongNote[], subject: string, book: string, chapter: string) => {
  try {
    console.log('PDF 인쇄 시작');
    const pdf = await generatePDF(notes, subject, book, chapter);
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    
    const printWindow = window.open(url);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    console.log('PDF 인쇄 완료');
    return true;
  } catch (error) {
    console.error('PDF 인쇄 오류:', error);
    return false;
  }
};