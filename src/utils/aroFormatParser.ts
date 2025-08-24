import { toast } from "@/hooks/use-toast";

export interface ParsedQAEntry {
  question: string;
  answer: string;
}

export interface ParsedAROContent {
  explanation: string;
  qaEntries: ParsedQAEntry[];
  isValid: boolean;
  error?: string;
}

export const parseAROFormat = (content: string): ParsedAROContent => {
  try {
    // Sanitize input: trim whitespace, normalize line breaks, strip leading backslashes and escape sequences
    let sanitized = content.trim()
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/^\\===\s*ARO\s*START\s*===/gim, '===ARO START===')
      .replace(/^\\===\s*ARO\s*END\s*===/gim, '===ARO END===')
      .replace(/Q\\&A/g, 'Q&A')
      .replace(/\\&/g, '&');

    // Validate ARO markers
    const startMatch = sanitized.match(/===\s*ARO\s*START\s*===/i);
    const endMatch = sanitized.match(/===\s*ARO\s*END\s*===/i);
    
    if (!startMatch || !endMatch) {
      return {
        explanation: content,
        qaEntries: [],
        isValid: false,
        error: "Use the 'Copy Teacher Prompt' button and paste the result including ===ARO START/END==="
      };
    }

    // Extract content between markers, ignoring content outside START/END
    const startIndex = startMatch.index! + startMatch[0].length;
    const endIndex = endMatch.index!;
    const aroContent = sanitized.substring(startIndex, endIndex).trim();

    // Find <1> and <2> sections - more flexible matching
    const section1Match = aroContent.match(/^\s*<1>\s*.*$/m);
    const section2Match = aroContent.match(/^\s*<2>\s*.*$/m);

    if (!section1Match || !section2Match) {
      return {
        explanation: content,
        qaEntries: [],
        isValid: false,
        error: "Missing <1> explanation or <2> Q&A sections"
      };
    }

    // Extract explanation (between <1> and <2>)
    const section1Index = section1Match.index! + section1Match[0].length;
    const section2Index = section2Match.index!;
    const explanation = aroContent.substring(section1Index, section2Index).trim();

    // Extract Q&A block (after <2>)
    const qaBlockStart = section2Index + section2Match[0].length;
    const qaBlock = aroContent.substring(qaBlockStart).trim();

    // Parse Q&A pairs
    const qaEntries = parseQAPairs(qaBlock);

    // Limit to 200 pairs max as specified
    const limitedQaEntries = qaEntries.slice(0, 200);

    return {
      explanation,
      qaEntries: limitedQaEntries,
      isValid: true
    };
  } catch (error) {
    console.error('ARO parsing error:', error);
    return {
      explanation: content,
      qaEntries: [],
      isValid: false,
      error: "Failed to parse ARO format"
    };
  }
};

const parseQAPairs = (qaBlock: string): ParsedQAEntry[] => {
  const pairs: ParsedQAEntry[] = [];
  
  // Split by Q patterns and process each section
  const qSections = qaBlock.split(/(?=^\s*Q[.:)]\s*)/m);
  
  for (const section of qSections) {
    if (!section.trim()) continue;
    
    const qMatch = section.match(/^Q[.:)]\s*(.+)$/im);
    if (!qMatch) continue;
    
    const question = qMatch[1].trim();
    
    // Find answer after the Q line
    const aMatch = section.match(/^A[.:)]\s*([\s\S]+?)(?=^\s*Q[.:)]\s*|\Z)/im);
    if (!aMatch) continue;
    
    const answer = aMatch[1].trim();
    
    if (question && answer) {
      pairs.push({ question, answer });
    }
  }
  
  return pairs;
};

export const getTeacherPrompt = (language: 'KR' | 'EN'): string => {
  if (language === 'KR') {
    return `당신은 선생님이다. 내가 방금 공부한 주제를 ARO 앱에 저장해 복습하려고 한다. 아래 형식 그대로, 마크다운 금지, 불필요한 기호 금지. 반드시 '===ARO START==='로 시작하고 '===ARO END==='로 끝내라. 한국어로 작성.

===ARO START===
<1> 설명문
- 주제: {주제명}
- 핵심 개념: 한 줄 요약 3개.
- 상세 설명: 5~10문장. 예시 1개 포함.
- 체크리스트: 5개 항목. 각 항목은 동사로 시작.
- 기록 팁: 2~3문장. 메타지식(왜/언제 써먹는지) 위주.

<2> Q&A
Q. 핵심 개념 1을 설명하라.
A. 정의와 포인트 2~3개.

Q. 예시 상황에서 어떻게 적용하나.
A. 단계 3단계로 설명.

Q. 흔한 오해 1가지와 교정법은.
A. 오해 서술 후 정정 포인트.

Q. 암기용 한 줄 요약은.
A. 20자 내외 슬로건.

Q. 실전 체크 항목은.
A. 불릿 3~5개.
===ARO END===`;
  } else {
    return `You are a teacher. I will save this topic into the ARO app for spaced review. Output must be plain text only, no markdown. Start with '===ARO START===' and end with '===ARO END==='. Write in English.

===ARO START===
<1> Explanation
- Topic: {topic}
- Key ideas: three one-liners.
- Detailed notes: 5–10 sentences, include one example.
- Checklist: 5 action items, start with verbs.
- Recording tips: 2–3 sentences on why/when to use.

<2> Q&A
Q. Explain key idea 1.
A. Definition plus 2–3 bullet points.

Q. Apply it in an example case.
A. Describe in 3 steps.

Q. One common misconception and fix?
A. State the misconception and the correction.

Q. One-line memory hook?
A. 20-character slogan.

Q. Practical checks?
A. 3–5 bullets.
===ARO END===`;
  }
};