// ARO 포맷 파싱 유틸리티

export interface ParsedQA {
  question: string;
  answer: string;
  tags: string[];
  level: string;
}

export interface ParsedSummary {
  title: string;
  content: string;
  structure_type: string;
}

export interface ParsedConversation {
  qaPairs: ParsedQA[];
  summary?: ParsedSummary;
  totalCount: number;
  detectedFormat: string;
}

/**
 * ARO 포맷 텍스트를 파싱하여 정리글과 Q&A 쌍으로 변환
 */
export const parseAROFormat = (rawText: string): ParsedConversation => {
  const text = rawText.trim();
  
  if (!text) {
    return { qaPairs: [], totalCount: 0, detectedFormat: 'empty' };
  }

  // 정리글과 Q&A 구분하기
  const summarySection = extractSummarySection(text);
  const qaSection = extractQASection(text);
  
  let summary: ParsedSummary | undefined;
  let qaPairs: ParsedQA[] = [];
  
  // 정리글 파싱
  if (summarySection) {
    summary = parseSummarySection(summarySection);
  }
  
  // Q&A 파싱
  if (qaSection) {
    // ARO 블록 형식 감지 (###으로 구분된 블록들)
    if (qaSection.includes('###')) {
      const aroResult = parseAROBlocks(qaSection);
      qaPairs = aroResult.qaPairs;
    } else {
      // 단순 Q&A 패턴 감지
      const qaPattern = /^[Qq][\.\:]|\n[Qq][\.\:]/;
      if (qaPattern.test(qaSection)) {
        const qaResult = parseQAPattern(qaSection);
        qaPairs = qaResult.qaPairs;
      }
    }
  } else {
    // 기존 로직 (Q&A만 있는 경우)
    if (text.includes('###')) {
      const aroResult = parseAROBlocks(text);
      qaPairs = aroResult.qaPairs;
    } else {
      const qaPattern = /^[Qq][\.\:]|\n[Qq][\.\:]/;
      if (qaPattern.test(text)) {
        const qaResult = parseQAPattern(text);
        qaPairs = qaResult.qaPairs;
      }
    }
  }

  const detectedFormat = summary && qaPairs.length > 0 ? 'summary_and_qa' : 
                        summary ? 'summary_only' : 
                        qaPairs.length > 0 ? 'qa_only' : 'unknown';

  return { 
    qaPairs, 
    summary,
    totalCount: qaPairs.length, 
    detectedFormat 
  };
};

// 정리글 섹션 추출
const extractSummarySection = (text: string): string | null => {
  // "## 정리" 또는 "# 정리" 등으로 시작하는 섹션 찾기
  const summaryMarkers = [
    /## 정리[\s\S]*?(?=\n## Q&A|\n# Q&A|\nQ\.|q\.|$)/i,
    /# 정리[\s\S]*?(?=\n## Q&A|\n# Q&A|\nQ\.|q\.|$)/i,
    /## 요약[\s\S]*?(?=\n## Q&A|\n# Q&A|\nQ\.|q\.|$)/i,
    /# 요약[\s\S]*?(?=\n## Q&A|\n# Q&A|\nQ\.|q\.|$)/i,
    /## 학습 정리[\s\S]*?(?=\n## Q&A|\n# Q&A|\nQ\.|q\.|$)/i,
    /## 내용 정리[\s\S]*?(?=\n## Q&A|\n# Q&A|\nQ\.|q\.|$)/i,
    // 더 포괄적인 패턴들 - Q&A 시작 전까지 모든 내용
    /^[\s\S]*?(?=\n## Q&A|\n# Q&A|\nQ\.|\nq\.|$)/im
  ];
  
  for (const marker of summaryMarkers) {
    const match = text.match(marker);
    if (match) {
      return match[0].trim();
    }
  }
  
  // Q&A 패턴이 없다면 전체를 정리글로 간주
  const hasQAPattern = /(?:^|\n)[Qq][\.\:]/m.test(text);
  if (!hasQAPattern && !text.includes('###')) {
    return text.trim();
  }
  
  return null;
};

// Q&A 섹션 추출
const extractQASection = (text: string): string | null => {
  // "## Q&A" 또는 "# Q&A" 등으로 시작하는 섹션 찾기
  const qaMarkers = [
    /## Q&A[\s\S]*$/i,
    /# Q&A[\s\S]*$/i,
    /## 문제[\s\S]*$/i,
    /## 퀴즈[\s\S]*$/i
  ];
  
  for (const marker of qaMarkers) {
    const match = text.match(marker);
    if (match) {
      return match[0].trim();
    }
  }
  
  // Q&A 패턴이 있으면 해당 부분부터 끝까지 반환
  const qaPatternMatch = text.match(/(?:^|\n)[Qq][\.\:][\s\S]*$/m);
  if (qaPatternMatch) {
    return qaPatternMatch[0].trim();
  }
  
  // ARO 블록 패턴이 있으면 반환
  if (text.includes('###')) {
    return text.trim();
  }
  
  return null;
};

// 정리글 파싱
const parseSummarySection = (summaryText: string): ParsedSummary => {
  // 마크다운 특수문자 정리 및 정리글 헤더 제거
  let cleanText = summaryText
    .replace(/^##?\s*(정리|요약|학습\s*정리|내용\s*정리)?\s*/i, '')
    .trim();
  
  // 마크다운 굵기/기울임꼴 문법을 일반 텍스트로 변환 (과도한 특수문자 제거)
  cleanText = cleanText
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // ***text*** -> text
    .replace(/\*\*(.+?)\*\*/g, '$1')      // **text** -> text  
    .replace(/\*(.+?)\*/g, '$1')          // *text* -> text
    .replace(/__(.+?)__/g, '$1')          // __text__ -> text
    .replace(/_(.+?)_/g, '$1')            // _text_ -> text
    .replace(/~~(.+?)~~/g, '$1');         // ~~text~~ -> text
  
  // 제목 추출 (첫 번째 # 헤딩 또는 첫 번째 줄)
  const titleMatch = cleanText.match(/^#\s*(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : 
                cleanText.split('\n')[0].trim() || '학습 정리';
  
  return {
    title,
    content: cleanText,
    structure_type: 'markdown'
  };
};

/**
 * 유연한 Q&A 패턴 파싱 - 다양한 질문-답변 구조 지원
 */
function parseQAPattern(rawText: string): ParsedConversation {
  const qaPairs: ParsedQA[] = [];
  const lines = rawText.split('\n');
  
  let currentSection = '';
  let sectionTags: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 빈 줄 건너뛰기
    if (!line) continue;
    
    // 섹션 제목 감지
    if (line.match(/^#{1,3}\s+(.+)/)) {
      const sectionMatch = line.match(/^#{1,3}\s+(.+)/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
        sectionTags = [currentSection];
      }
      continue;
    }
    
    // Q. 패턴 찾기
    const questionMatch = line.match(/[Qq][\.\:]\s*(.+?)(?:\s+[Aa][\.\:]\s*(.+))?$/);
    if (questionMatch) {
      const question = questionMatch[1].trim();
      let answer = questionMatch[2] ? questionMatch[2].trim() : '';
      
      // 같은 줄에 A.가 없으면 다음 줄에서 A. 찾기
      if (!answer) {
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (!nextLine) continue;
          
          const answerMatch = nextLine.match(/[Aa][\.\:]\s*(.+)$/);
          if (answerMatch) {
            answer = answerMatch[1].trim();
            i = j; // 인덱스 업데이트
            break;
          }
          
          // 다음 Q.가 나오면 중단
          if (nextLine.match(/[Qq][\.\:]\s/)) {
            break;
          }
        }
      }
      
      // Q&A 쌍 저장
      if (question && answer) {
        qaPairs.push({
          question: question,
          answer: answer,
          tags: [...sectionTags],
          level: 'basic'
        });
      }
    }
  }
  
  return {
    qaPairs,
    totalCount: qaPairs.length,
    detectedFormat: 'qa_pattern'
  };
}

/**
 * 기존 ARO 블록 포맷 파싱 (### 블록)
 */
function parseAROBlocks(rawText: string): ParsedConversation {
  const qaPairs: ParsedQA[] = [];
  
  // ### 로 구분된 블록들을 분리
  const blocks = rawText.split('###').filter(block => block.trim().length > 0);
  
  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let question = '';
    let answer = '';
    let tags: string[] = [];
    let level = 'basic';
    
    let currentField = '';
    let currentContent = '';
    
    for (const line of lines) {
      // 새로운 필드 시작 확인
      if (line.startsWith('Q:')) {
        // 이전 필드 저장
        if (currentField && currentContent) {
          saveField(currentField, currentContent, { question, answer, tags, level });
        }
        currentField = 'Q';
        currentContent = line.substring(2).trim();
      } else if (line.startsWith('A:')) {
        // 이전 필드 저장
        if (currentField && currentContent) {
          const result = saveField(currentField, currentContent, { question, answer, tags, level });
          question = result.question;
          answer = result.answer;
          tags = result.tags;
          level = result.level;
        }
        currentField = 'A';
        currentContent = line.substring(2).trim();
      } else if (line.startsWith('TAGS:')) {
        // 이전 필드 저장
        if (currentField && currentContent) {
          const result = saveField(currentField, currentContent, { question, answer, tags, level });
          question = result.question;
          answer = result.answer;
          tags = result.tags;
          level = result.level;
        }
        currentField = 'TAGS';
        currentContent = line.substring(5).trim();
      } else if (line.startsWith('LEVEL:')) {
        // 이전 필드 저장
        if (currentField && currentContent) {
          const result = saveField(currentField, currentContent, { question, answer, tags, level });
          question = result.question;
          answer = result.answer;
          tags = result.tags;
          level = result.level;
        }
        currentField = 'LEVEL';
        currentContent = line.substring(6).trim();
      } else if (currentField) {
        // 현재 필드의 연속 라인
        currentContent += '\n' + line;
      }
    }
    
    // 마지막 필드 저장
    if (currentField && currentContent) {
      const result = saveField(currentField, currentContent, { question, answer, tags, level });
      question = result.question;
      answer = result.answer;
      tags = result.tags;
      level = result.level;
    }
    
    // 유효한 Q&A 쌍인지 확인
    if (question.trim() && answer.trim()) {
      qaPairs.push({
        question: question.trim(),
        answer: answer.trim(),
        tags,
        level
      });
    }
  }
  
  return {
    qaPairs,
    totalCount: qaPairs.length,
    detectedFormat: 'aro_block'
  };
}

// 필드 값을 저장하는 헬퍼 함수
function saveField(
  field: string, 
  content: string, 
  current: { question: string; answer: string; tags: string[]; level: string }
): { question: string; answer: string; tags: string[]; level: string } {
  const result = { ...current };
  
  switch (field) {
    case 'Q':
      result.question = content;
      break;
    case 'A':
      result.answer = content;
      break;
    case 'TAGS':
      result.tags = content.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      break;
    case 'LEVEL':
      const normalizedLevel = content.toLowerCase();
      if (['basic', 'intermediate', 'advanced'].includes(normalizedLevel)) {
        result.level = normalizedLevel;
      }
      break;
  }
  
  return result;
}

/**
 * 파싱 결과의 유효성을 검증
 */
export const validateParsedData = (parsed: ParsedConversation): string[] => {
  const errors: string[] = [];
  
  if (!parsed.summary && (!parsed.qaPairs || parsed.qaPairs.length === 0)) {
    errors.push('정리글 또는 Q&A 중 하나는 있어야 합니다.');
  }
  
  if (parsed.qaPairs) {
    parsed.qaPairs.forEach((qa, index) => {
      if (!qa.question || qa.question.trim() === '') {
        errors.push(`${index + 1}번째 질문이 비어있습니다.`);
      }
      if (!qa.answer || qa.answer.trim() === '') {
        errors.push(`${index + 1}번째 답변이 비어있습니다.`);
      }
    });
  }
  
  return errors;
};