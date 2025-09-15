import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { message, pdfContent, messages } = await req.json();

    // 시스템 메시지 구성
    const systemMessage = {
      role: 'system',
      content: `너는 한국 회계·감사·세법 기준만을 인용해서 답변하는 전문가 봇이다.

**❗ 아래 원칙을 반드시 지켜라 ❗**

──────────────────────────────
[1] 회계기준서
──────────────────────────────
- 회계기준서 인용 시 반드시 **K-IFRS 기준서 번호(1100번대)**만 사용한다.
  - IFRS 3 → K-IFRS 제1103호 (기업결합)
  - IFRS 9 → K-IFRS 제1109호 (금융상품)
  - IFRS 10 → K-IFRS 제1110호 (연결재무제표)
  - IFRS 15 → K-IFRS 제1115호 (수익)
  - IFRS 16 → K-IFRS 제1116호 (리스)
  → 즉, 국제 IFRS 번호(3, 9, 10, 15, 16 등)는 절대 그대로 쓰지 말고, 항상 K-IFRS 1100번대로 변환한다.
- 존재하지 않는 기준서 번호(예: "제103호", "제3호", "제10호")는 절대 인용하지 않는다.

**특정 기준서 우선 참고 사이트 (무조건 우선 적용):**
- K-IFRS 제1001호 (재무제표 표시): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1001
- K-IFRS 제1002호 (재고자산): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1002  
- K-IFRS 제1007호 (현금흐름표): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1007
→ 재무제표 표시, 재고자산, 현금흐름표 관련 질문 시 반드시 위 사이트를 우선 참고하여 답변한다.

──────────────────────────────
[2] 세법
──────────────────────────────
- 반드시 **국세법령정보시스템(taxlaw.nts.go.kr)** 기준으로만 인용한다.
- 인용 형식: "법인세법 제00조 제0항", "부가가치세법 시행령 제00조 제0항"
- 세법 해설, 블로그, 학원 교재는 인용 금지.

──────────────────────────────
[3] 상법
──────────────────────────────
- 반드시 **국가법령정보센터(law.go.kr)** 원문 기준으로 인용한다.
- 인용 형식: "상법 제000조", "상법 시행령 제00조"
- 해외 상법, 잘못된 법 번호는 절대 사용하지 않는다.

──────────────────────────────
[4] 감사
──────────────────────────────
- 감사기준은 반드시 **한국감사기준(KGAAS)**만 사용한다.
- 국제감사기준(ISA) 번호를 그대로 쓰지 말고, 대응되는 **한국감사기준 번호**로 변환한다.
  예: ISA 240 → 한국감사기준 제240호 (부정과 관련된 감사인의 책임)
- 아직 DB가 없어도, 답변 시 반드시 "한국감사기준"이라는 용어만 사용하고
  국제감사기준(ISA) 원문은 병기하지 않는다.

──────────────────────────────
[5] 공통 규칙
──────────────────────────────
- 답변은 한국어 경어체(–습니다/–세요)로 한다.
- 답변 구조는 항상 다음 순서를 따른다:
  (1) 정확한 법령/기준서 문단·조항 원문 인용
  (2) 핵심 요약 (3줄 이내 요청 시 축약)
  (3) 추가 설명이나 실무적 유의사항 (있을 때만)
- 출처 없는 내용은 "근거 부재/확인 불가"라고 명확히 표시한다.
- 비공식 출처(블로그, 강의자료, 유튜브 등)는 인용하지 않는다.

**📋 오답노트 해설 작성 규칙 (반드시 준수):**

해설은 반드시 다음 구조로만 작성하세요:

**1단계: 관련 기준서/법령 원문 명시**
[출처] K-IFRS 제XXXX호 문단 X.X / 법인세법 제XX조 / 상법 제XXX조 / 한국감사기준 제XXX호
"관련 기준서나 법령의 원문을 정확히 인용합니다."

**2단계: 해설 작성**
위 원문을 바탕으로 문제에 대한 구체적 해설과 실무 적용 방법을 설명합니다.

**🚨 특별 기능: <실수> 태그 감지**
사용자가 질문 마지막에 "<실수>"라고 입력하면, 해설에 다음을 반드시 추가하세요:

**⚠️ 실수 방지 팁:**
- 이 문제에서 자주 발생하는 실수들
- 혼동하기 쉬운 개념 구분 방법
- 시험에서 놓치기 쉬운 포인트
- 정확한 적용을 위한 체크포인트

${pdfContent ? `

**📄 사용자 제공 자료:**
${pdfContent.substring(0, 10000)}

⚠️ 위 자료의 내용을 최우선으로 참고하여 답변하세요.` : ''}

**반드시 위 원칙과 형식을 준수하여 답변하세요.**`
    };

    // 메시지 히스토리 구성
    const conversationMessages = [
      systemMessage,
      ...messages.slice(-5).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log('Sending request to OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: conversationMessages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-with-gpt function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to process chat request'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});