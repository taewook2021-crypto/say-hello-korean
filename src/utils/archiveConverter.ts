// 아카이브 Q&A를 기존 시스템 형식으로 변환하는 유틸리티

import { ParsedQA } from './aroParser';

// FlashCard에서 사용하는 WrongNote 인터페이스와 동일하게 정의
interface WrongNote {
  id: string;
  question: string;
  wrong_answer: string | null;
  correct_answer: string;
  explanation: string | null;
  subject_name: string;
  book_name: string;
  chapter_name: string;
  is_resolved: boolean;
}

/**
 * 아카이브의 Q&A 데이터를 기존 WrongNote 형식으로 변환
 * @param qaPairs 파싱된 Q&A 배열
 * @param conversationTitle 대화 제목
 * @param conversationId 대화 ID
 * @returns WrongNote 형식의 배열
 */
export function convertArchiveToWrongNotes(
  qaPairs: ParsedQA[],
  conversationTitle: string,
  conversationId: string
): WrongNote[] {
  return qaPairs.map((qa, index) => ({
    id: `archive-${conversationId}-${index}`,
    question: qa.question,
    wrong_answer: null, // 아카이브는 틀린 답이 없음
    correct_answer: qa.answer,
    explanation: qa.tags?.length > 0 ? `태그: ${qa.tags.join(', ')}` : null,
    subject_name: conversationTitle,
    book_name: "아카이브",
    chapter_name: `${conversationTitle.substring(0, 20)}...`,
    is_resolved: false
  }));
}

// Notes.tsx와 호환되는 형식으로 변환하는 별도 함수
export function convertArchiveToNotesFormat(
  qaPairs: ParsedQA[],
  conversationTitle: string,
  conversationId: string
) {
  return qaPairs.map((qa, index) => ({
    id: `archive-${conversationId}-${index}`,
    question: qa.question,
    wrongAnswer: null, // 아카이브는 틀린 답이 없음
    correctAnswer: qa.answer,
    createdAt: new Date(),
    isResolved: false
  }));
}

/**
 * 아카이브 Q&A 데이터의 유효성 검사
 * @param qaPairs 파싱된 Q&A 배열
 * @returns 유효한 Q&A 개수
 */
export function validateArchiveQAs(qaPairs: ParsedQA[]): number {
  return qaPairs.filter(qa => 
    qa.question && qa.question.trim().length > 0 &&
    qa.answer && qa.answer.trim().length > 0
  ).length;
}

/**
 * 아카이브 제목에서 과목명 추출 시도
 * @param title 아카이브 제목
 * @returns 추정되는 과목명
 */
export function extractSubjectFromTitle(title: string): string {
  // 일반적인 과목명 키워드들
  const subjects = [
    '수학', '영어', '국어', '물리', '화학', '생물', '지구과학',
    '한국사', '세계사', '사회', '과학', '음악', '미술', '체육',
    '정보', '컴퓨터', '프로그래밍', 'JavaScript', 'Python', 'Java',
    '데이터베이스', '알고리즘', '자료구조', '운영체제', '네트워크'
  ];
  
  const foundSubject = subjects.find(subject => 
    title.toLowerCase().includes(subject.toLowerCase())
  );
  
  return foundSubject || title.split(' ')[0] || '기타';
}