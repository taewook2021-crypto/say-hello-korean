// ARO 포맷 파싱 유틸리티

export interface ParsedQA {
  question: string;
  answer: string;
  tags: string[];
  level: string;
}

export interface ParsedConversation {
  qaPairs: ParsedQA[];
  totalCount: number;
  detectedFormat: 'aro_block' | 'qa_pattern' | 'mixed';
}

/**
 * ARO 포맷 텍스트를 파싱하여 Q&A 쌍으로 변환
 * 
 * 지원 포맷:
 * 1. ARO 블록 포맷:
 *    ###
 *    Q: 질문내용
 *    A: 답변내용
 *    TAGS: 태그1, 태그2, 태그3
 *    LEVEL: basic|intermediate|advanced
 * 
 * 2. Q&A 패턴 포맷:
 *    **Q. 질문내용?
 *    A. 답변내용
 */
export const parseAROFormat = (rawText: string): ParsedConversation => {
  // 먼저 어떤 포맷인지 감지
  const hasAROBlocks = rawText.includes('###');
  const hasQAPattern = /\*\*Q\.\s/.test(rawText);
  
  let detectedFormat: 'aro_block' | 'qa_pattern' | 'mixed' = 'aro_block';
  if (hasQAPattern && !hasAROBlocks) {
    detectedFormat = 'qa_pattern';
  } else if (hasQAPattern && hasAROBlocks) {
    detectedFormat = 'mixed';
  }
  
  console.log(`포맷 감지: ${detectedFormat}`);
  
  // 포맷에 따라 적절한 파서 호출
  if (detectedFormat === 'qa_pattern') {
    return parseQAPattern(rawText);
  } else if (detectedFormat === 'mixed') {
    // 혼합 포맷의 경우 두 방식 모두 시도해서 병합
    const aroResult = parseAROBlocks(rawText);
    const qaResult = parseQAPattern(rawText);
    
    return {
      qaPairs: [...aroResult.qaPairs, ...qaResult.qaPairs],
      totalCount: aroResult.totalCount + qaResult.totalCount,
      detectedFormat: 'mixed'
    };
  } else {
    return parseAROBlocks(rawText);
  }
};

/**
 * 유연한 Q&A 패턴 파싱 - 다양한 질문-답변 구조 지원
 */
function parseQAPattern(rawText: string): ParsedConversation {
  const qaPairs: ParsedQA[] = [];
  const lines = rawText.split('\n');
  
  let currentQuestion = '';
  let currentAnswer = '';
  let currentSection = '';
  let sectionTags: string[] = [];
  let isInAnswer = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 빈 줄은 건너뛰기
    if (!line) continue;
    
    // 섹션 제목 감지 (### 또는 ## 또는 # 로 시작)
    if (line.match(/^#{1,3}\s+(.+)/)) {
      // 이전 Q&A 저장
      if (currentQuestion && currentAnswer) {
        qaPairs.push({
          question: currentQuestion.trim(),
          answer: currentAnswer.trim(),
          tags: [...sectionTags],
          level: 'basic'
        });
        currentQuestion = '';
        currentAnswer = '';
        isInAnswer = false;
      }
      
      const sectionMatch = line.match(/^#{1,3}\s+(.+)/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
        sectionTags = [currentSection];
        console.log(`섹션 감지: ${currentSection}`);
      }
      continue;
    }
    
    // 다양한 질문 패턴 감지
    const questionPatterns = [
      /^\*\*Q[.:]?\s*(.+)/i,  // **Q. 또는 **Q: 
      /^Q[.:]?\s*(.+)/i,      // Q. 또는 Q:
      /^질문[.:]?\s*(.+)/i,    // 질문. 또는 질문:
      /^문제[.:]?\s*(.+)/i,    // 문제. 또는 문제:
      /^(.+\?)\s*$/,          // 물음표로 끝나는 문장
    ];
    
    let isQuestion = false;
    let questionText = '';
    
    for (const pattern of questionPatterns) {
      const match = line.match(pattern);
      if (match) {
        // 이전 Q&A 저장
        if (currentQuestion && currentAnswer) {
          qaPairs.push({
            question: currentQuestion.trim(),
            answer: currentAnswer.trim(),
            tags: [...sectionTags],
            level: 'basic'
          });
        }
        
        questionText = match[1].trim();
        isQuestion = true;
        break;
      }
    }
    
    if (isQuestion) {
      currentQuestion = questionText;
      currentAnswer = '';
      isInAnswer = false;
      continue;
    }
    
    // 다양한 답변 패턴 감지
    const answerPatterns = [
      /^A[.:]?\s*(.+)/i,      // A. 또는 A:
      /^답[.:]?\s*(.+)/i,      // 답. 또는 답:
      /^답변[.:]?\s*(.+)/i,    // 답변. 또는 답변:
      /^해답[.:]?\s*(.+)/i,    // 해답. 또는 해답:
    ];
    
    let isAnswerStart = false;
    let answerText = '';
    
    for (const pattern of answerPatterns) {
      const match = line.match(pattern);
      if (match) {
        answerText = match[1].trim();
        isAnswerStart = true;
        break;
      }
    }
    
    if (isAnswerStart && currentQuestion) {
      currentAnswer = answerText;
      isInAnswer = true;
      continue;
    }
    
    // 질문이 있고 아직 답변이 시작되지 않았다면, 이 줄을 답변으로 간주
    if (currentQuestion && !currentAnswer && !isInAnswer) {
      currentAnswer = line;
      isInAnswer = true;
      continue;
    }
    
    // 답변 연속 라인 추가
    if (currentQuestion && isInAnswer && line) {
      // 다음 질문이 아닌지 확인
      let isNextQuestion = false;
      for (const pattern of questionPatterns) {
        if (pattern.test(line)) {
          isNextQuestion = true;
          break;
        }
      }
      
      if (!isNextQuestion) {
        currentAnswer += '\n' + line;
      } else {
        // 다음 질문이므로 현재 Q&A 저장하고 이 줄을 다시 처리
        if (currentQuestion && currentAnswer) {
          qaPairs.push({
            question: currentQuestion.trim(),
            answer: currentAnswer.trim(),
            tags: [...sectionTags],
            level: 'basic'
          });
        }
        
        // 이 줄을 질문으로 처리
        for (const pattern of questionPatterns) {
          const match = line.match(pattern);
          if (match) {
            currentQuestion = match[1].trim();
            currentAnswer = '';
            isInAnswer = false;
            break;
          }
        }
      }
    }
  }
  
  // 마지막 Q&A 저장
  if (currentQuestion && currentAnswer) {
    qaPairs.push({
      question: currentQuestion.trim(),
      answer: currentAnswer.trim(),
      tags: [...sectionTags],
      level: 'basic'
    });
  }
  
  console.log(`Q&A 패턴 파싱 완료: ${qaPairs.length}개 추출`);
  
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
  
  if (parsed.qaPairs.length === 0) {
    errors.push("유효한 Q&A 쌍이 발견되지 않았습니다.");
  }
  
  parsed.qaPairs.forEach((qa, index) => {
    if (!qa.question.trim()) {
      errors.push(`${index + 1}번째 블록: 질문이 비어있습니다.`);
    }
    if (!qa.answer.trim()) {
      errors.push(`${index + 1}번째 블록: 답변이 비어있습니다.`);
    }
  });
  
  return errors;
};