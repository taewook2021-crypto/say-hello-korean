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
  const hasQAPattern = /Q\.\s/.test(rawText) || /\*\*Q\.\s/.test(rawText);
  
  let detectedFormat: 'aro_block' | 'qa_pattern' | 'mixed' = 'aro_block';
  if (hasQAPattern && !hasAROBlocks) {
    detectedFormat = 'qa_pattern';
  } else if (hasQAPattern && hasAROBlocks) {
    detectedFormat = 'mixed';
  }
  
  console.log(`포맷 감지: ${detectedFormat}, Q패턴: ${hasQAPattern}, ARO블록: ${hasAROBlocks}`);
  
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
  
  let currentSection = '';
  let sectionTags: string[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // 빈 줄 건너뛰기
    if (!line) {
      i++;
      continue;
    }
    
    // 섹션 제목 감지
    if (line.match(/^#{1,3}\s+(.+)/)) {
      const sectionMatch = line.match(/^#{1,3}\s+(.+)/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
        sectionTags = [currentSection];
        console.log(`섹션 감지: ${currentSection}`);
      }
      i++;
      continue;
    }
    
    // Q. 패턴으로 시작하는 질문 찾기
    const questionMatch = line.match(/^Q\.\s*(.+)/);
    if (questionMatch) {
      const question = questionMatch[1].trim();
      let answer = '';
      
      // 다음 줄부터 A. 패턴 찾기
      i++;
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        
        // 빈 줄이면 건너뛰기
        if (!nextLine) {
          i++;
          continue;
        }
        
        // A. 패턴 찾기
        const answerMatch = nextLine.match(/^A\.\s*(.+)/);
        if (answerMatch) {
          answer = answerMatch[1].trim();
          
          // A. 다음 줄들도 답변에 포함 (다음 Q.가 나올 때까지)
          i++;
          while (i < lines.length) {
            const continueLine = lines[i].trim();
            
            // 다음 Q. 패턴이 나오면 중단
            if (continueLine.match(/^Q\.\s/)) {
              break;
            }
            
            // 빈 줄이 아니면 답변에 추가
            if (continueLine) {
              answer += '\n' + continueLine;
            }
            
            i++;
          }
          
          // Q&A 쌍 저장
          if (question && answer) {
            qaPairs.push({
              question: question.trim(),
              answer: answer.trim(),
              tags: [...sectionTags],
              level: 'basic'
            });
            console.log(`Q&A 추출: Q="${question.slice(0, 20)}..." A="${answer.slice(0, 20)}..."`);
          }
          
          // i는 이미 다음 Q. 위치이므로 continue로 다시 처리
          break;
        }
        
        i++;
      }
      
      // A.를 찾지 못한 경우에도 i를 증가시켜 무한루프 방지
      continue;
    }
    
    i++;
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