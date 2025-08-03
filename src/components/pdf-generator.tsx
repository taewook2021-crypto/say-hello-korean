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

export const generatePDF = async (notes: WrongNote[], subject: string, book: string, chapter: string) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // 한글 폰트 설정을 위한 기본 폰트 사용
  pdf.setFont('helvetica');

  // 제목 페이지
  pdf.setFontSize(24);
  pdf.text('오답노트', pageWidth / 2, yPosition + 20, { align: 'center' });
  
  yPosition += 40;
  pdf.setFontSize(16);
  pdf.text(`과목: ${subject}`, margin, yPosition);
  yPosition += 10;
  pdf.text(`교재: ${book}`, margin, yPosition);
  yPosition += 10;
  pdf.text(`단원: ${chapter}`, margin, yPosition);
  yPosition += 15;
  pdf.text(`작성일: ${new Date().toLocaleDateString('ko-KR')}`, margin, yPosition);
  yPosition += 15;
  pdf.text(`총 문제 수: ${notes.length}개`, margin, yPosition);

  // 구분선
  yPosition += 20;
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 20;

  // 각 노트 처리
  notes.forEach((note, index) => {
    // 새 페이지가 필요한 경우
    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      yPosition = margin;
    }

    // 문제 번호
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`문제 ${index + 1}`, margin, yPosition);
    yPosition += 15;

    // 문제 내용
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    
    // 문제 박스
    pdf.setFillColor(240, 248, 255); // 연한 파란색
    pdf.rect(margin, yPosition - 5, contentWidth, 30, 'F');
    pdf.rect(margin, yPosition - 5, contentWidth, 30, 'S');
    
    const questionLines = pdf.splitTextToSize(note.question, contentWidth - 10);
    pdf.text(questionLines, margin + 5, yPosition + 5);
    yPosition += Math.max(30, questionLines.length * 5 + 10);

    // 정답 박스
    yPosition += 10;
    pdf.setFillColor(240, 255, 240); // 연한 초록색
    pdf.rect(margin, yPosition - 5, contentWidth, 20, 'F');
    pdf.rect(margin, yPosition - 5, contentWidth, 20, 'S');
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('정답:', margin + 5, yPosition + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(note.correctAnswer, margin + 25, yPosition + 5);
    yPosition += 20;

    // 해설 (있는 경우)
    if (note.explanation) {
      yPosition += 10;
      pdf.setFillColor(248, 248, 248); // 연한 회색
      const explanationLines = pdf.splitTextToSize(note.explanation, contentWidth - 10);
      const explanationHeight = Math.max(20, explanationLines.length * 5 + 10);
      
      pdf.rect(margin, yPosition - 5, contentWidth, explanationHeight, 'F');
      pdf.rect(margin, yPosition - 5, contentWidth, explanationHeight, 'S');
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('해설:', margin + 5, yPosition + 5);
      pdf.setFont('helvetica', 'normal');
      pdf.text(explanationLines, margin + 5, yPosition + 15);
      yPosition += explanationHeight;
    }

    // 상태 표시
    yPosition += 10;
    pdf.setFontSize(10);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`작성일: ${note.createdAt.toLocaleDateString('ko-KR')}`, margin, yPosition);
    pdf.text(`상태: ${note.isResolved ? '해결완료' : '미해결'}`, pageWidth - margin - 30, yPosition);
    
    // 구분선
    yPosition += 15;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 20;
    
    // 색상 리셋
    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(0, 0, 0);
  });

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