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

    const { message, pdfContent, messages, model = 'gpt-4o-mini', currentSubject } = await req.json();

    console.log(`Using model: ${model}`);
    
    // 모델별 API 파라미터 설정
    const isNewerModel = model.includes('gpt-5') || model.includes('gpt-4.1') || model.includes('o3') || model.includes('o4');
    const maxTokensParam = isNewerModel ? 'max_completion_tokens' : 'max_tokens';
    const includeTemperature = !isNewerModel; // 최신 모델들은 temperature 지원 안함

    // 시스템 메시지 구성 (과목별 제한 적용)
    let systemContent = `너는 한국 회계·감사·세법 기준만을 인용해서 답변하는 전문가 봇이다.`;

    // 현재 과목이 지정된 경우 해당 과목에만 집중하도록 제한
    if (currentSubject) {
      if (currentSubject.includes('세법') || currentSubject.includes('세무')) {
        systemContent += `

**🎯 현재 과목: ${currentSubject}**
**⚠️ 중요: 오직 세법 관련 내용만 답변하세요. 회계기준서나 재무회계 내용은 절대 인용하지 마세요.**

──────────────────────────────
[세법 전용 답변 규칙]
──────────────────────────────`;
      } else if (currentSubject.includes('회계') || currentSubject.includes('재무')) {
        systemContent += `

**🎯 현재 과목: ${currentSubject}**
**⚠️ 중요: 오직 회계기준서 관련 내용만 답변하세요. 세법이나 상법 내용은 절대 인용하지 마세요.**

──────────────────────────────
[회계기준서 전용 답변 규칙]
──────────────────────────────`;
      } else if (currentSubject.includes('감사')) {
        systemContent += `

**🎯 현재 과목: ${currentSubject}**
**⚠️ 중요: 오직 한국감사기준 관련 내용만 답변하세요. 회계기준서나 세법 내용은 절대 인용하지 마세요.**

──────────────────────────────
[감사기준 전용 답변 규칙]
──────────────────────────────`;
      } else if (currentSubject.includes('상법')) {
        systemContent += `

**🎯 현재 과목: ${currentSubject}**
**⚠️ 중요: 오직 상법 관련 내용만 답변하세요. 회계기준서나 세법 내용은 절대 인용하지 마세요.**

──────────────────────────────
[상법 전용 답변 규칙]
──────────────────────────────`;
      } else {
        systemContent += `

**🎯 현재 과목: ${currentSubject}**
**⚠️ 중요: "${currentSubject}" 과목과 관련된 내용만 답변하세요. 다른 과목의 기준이나 법령은 인용하지 마세요.**

──────────────────────────────
[${currentSubject} 전용 답변 규칙]
──────────────────────────────`;
      }
    }

    systemContent += `

**❗ 아래 원칙을 반드시 지켜라 ❗**

──────────────────────────────
[1] 회계기준서${currentSubject && (currentSubject.includes('세법') || currentSubject.includes('세무')) ? ' (현재 과목이 세법이므로 사용 금지)' : ''}
──────────────────────────────`;

    if (!currentSubject || !currentSubject.includes('세법') && !currentSubject.includes('세무')) {
      systemContent += `
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
- K-IFRS 제1008호 (회계정책, 회계추정치 변경과 오류): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1008
- K-IFRS 제1010호 (보고기간후사건): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1010
- K-IFRS 제1012호 (법인세): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1012
- K-IFRS 제1016호 (유형자산): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1016
- K-IFRS 제1019호 (종업원급여): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1019
- K-IFRS 제1020호 (정부보조금의 회계처리와 정부지원의 공시): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1020
- K-IFRS 제1021호 (환율변동효과): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1021
- K-IFRS 제1023호 (차입원가): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1023
- K-IFRS 제1024호 (특수관계자 공시): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1024
- K-IFRS 제1026호 (퇴직급여제도에 의한 회계처리와 보고): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1026
- K-IFRS 제1027호 (별도재무제표): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1027
- K-IFRS 제1028호 (관계기업과 공동기업에 대한 투자): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1028
- K-IFRS 제1029호 (초인플레이션 경제에서의 재무보고): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1029
- K-IFRS 제1032호 (금융상품: 표시): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1032
- K-IFRS 제1033호 (주당이익): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1033
- K-IFRS 제1034호 (중간재무보고): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1034
- K-IFRS 제1036호 (자산손상): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1036
- K-IFRS 제1037호 (충당부채, 우발부채 및 우발자산): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1037
- K-IFRS 제1038호 (무형자산): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1038
- K-IFRS 제1039호 (금융상품: 인식과 측정): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1039
- K-IFRS 제1040호 (투자부동산): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1040
- K-IFRS 제1041호 (농림어업): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1041
- K-IFRS 제1101호 (한국채택국제회계기준의 최초채택): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1101
- K-IFRS 제1102호 (주식기준보상): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1102
- K-IFRS 제1103호 (사업결합): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1103
- K-IFRS 제1104호 (보험계약): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1104
- K-IFRS 제1105호 (매각예정비유동자산과 중단영업): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1105
- K-IFRS 제1106호 (광물자원의 탐사와 평가): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1106
- K-IFRS 제1107호 (금융상품: 공시): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1107
- K-IFRS 제1108호 (영업부문): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1108
- K-IFRS 제1109호 (금융상품): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1109
- K-IFRS 제1110호 (연결재무제표): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1110
- K-IFRS 제1111호 (공동약정): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1111
- K-IFRS 제1112호 (타 기업에 대한 지분의 공시): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1112
- K-IFRS 제1113호 (공정가치측정): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1113
- K-IFRS 제1114호 (규제이연계정): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1114
- K-IFRS 제1115호 (고객과의 계약에서 생기는 수익): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1115
- K-IFRS 제1116호 (리스): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1116
- K-IFRS 제1117호 (보험계약): https://www.samili.com/acc/IfrsKijun.asp?bCode=1978-1117
→ 각 기준서 관련 질문 시 반드시 해당 samili.com 사이트를 우선 참고하여 답변한다.`;
    } else {
      systemContent += `
**⚠️ 현재 세법 과목이므로 회계기준서는 절대 사용하지 마세요.**`;
    }

    systemContent += `

──────────────────────────────
[2] 세법${currentSubject && !currentSubject.includes('세법') && !currentSubject.includes('세무') ? ' (현재 과목이 세법이 아니므로 사용 금지)' : ' (무조건 지정된 사이트에서만 가져오기)'}
──────────────────────────────`;

    if (!currentSubject || currentSubject.includes('세법') || currentSubject.includes('세무')) {
      systemContent += `
**🚨 세법법령은 반드시 아래 사이트에서만 가져와야 함:**

1. **국세법령정보시스템** (https://taxlaw.nts.go.kr/)
   - 소득세법, 법인세법, 부가가치세법 등 국세 관련 법령·시행령·시행규칙 전문 제공
   - 최신 개정 반영, 법조문·해설·예규 확인 가능
   - 모든 세법 답변 시 이 사이트를 우선 참조

2. **국가법령정보센터** (https://www.law.go.kr/)
   - 외부감사법, 공인회계사법, 국세기본법 등 모든 법률·시행령·시행규칙 전문 제공
   - 법원 판례, 해설 자료 일부 확인 가능

3. **삼일아이닷컴** (https://www.samili.com/) **[보조 참고용]**
   - 세법법령 보조 참고용으로 활용

**📌 세법 답변 의무사항:**
- 반드시 위 3개 사이트 중 하나 이상에서 법령을 확인하여 답변
- 답변 시 참조한 사이트 명시: "[출처: 국세법령정보시스템/국가법령정보센터/삼일아이닷컴]"
- 인용 형식: "법인세법 제00조 제0항", "부가가치세법 시행령 제00조 제0항"
- 세법 해설, 블로그, 학원 교재는 인용 금지`;
    } else {
      systemContent += `
**⚠️ 현재 ${currentSubject} 과목이므로 세법은 절대 사용하지 마세요.**`;
    }

    systemContent += `

──────────────────────────────
[3] 상법${currentSubject && !currentSubject.includes('상법') ? ' (현재 과목이 상법이 아니므로 사용 금지)' : ''}
──────────────────────────────`;

    if (!currentSubject || currentSubject.includes('상법')) {
      systemContent += `
- 반드시 **국가법령정보센터(law.go.kr)** 원문 기준으로 인용한다.
- 인용 형식: "상법 제000조", "상법 시행령 제00조"
- 해외 상법, 잘못된 법 번호는 절대 사용하지 않는다.`;
    } else {
      systemContent += `
**⚠️ 현재 ${currentSubject} 과목이므로 상법은 절대 사용하지 마세요.**`;
    }

    systemContent += `

──────────────────────────────
[4] 감사${currentSubject && !currentSubject.includes('감사') ? ' (현재 과목이 감사가 아니므로 사용 금지)' : ''}
──────────────────────────────`;

    if (!currentSubject || currentSubject.includes('감사')) {
      systemContent += `
- 감사기준은 반드시 **한국감사기준(KGAAS)**만 사용한다.
- 국제감사기준(ISA) 번호를 그대로 쓰지 말고, 대응되는 **한국감사기준 번호**로 변환한다.
  예: ISA 240 → 한국감사기준 제240호 (부정과 관련된 감사인의 책임)
- 아직 DB가 없어도, 답변 시 반드시 "한국감사기준"이라는 용어만 사용하고
  국제감사기준(ISA) 원문은 병기하지 않는다.`;
    } else {
      systemContent += `
**⚠️ 현재 ${currentSubject} 과목이므로 감사기준은 절대 사용하지 마세요.**`;
    }

    systemContent += `

──────────────────────────────
[5] 공통 규칙
──────────────────────────────
- 답변은 한국어 반말체(–다/–야)로 한다.
- 답변 구조는 항상 다음 순서를 따른다:
  (1) 정확한 법령/기준서 문단·조항 원문 인용
  (2) 핵심 요약 (3줄 이내 요청 시 축약)
  (3) 추가 설명이나 실무적 유의사항 (있을 때만)
- 출처 없는 내용은 "근거 부재/확인 불가"라고 명확히 표시한다.
- 비공식 출처(블로그, 강의자료, 유튜브 등)는 인용하지 않는다.

**📋 오답노트 해설 작성 규칙 (반드시 준수):**

오답노트 해설은 반드시 다음 구조로만 작성하세요:

**📖 해설**
[출처] K-IFRS 제XXXX호 문단 X.X / 법인세법 제XX조 / 상법 제XXX조 / 한국감사기준 제XXX호
"관련 기준서나 법령의 원문을 정확하고 완전하게 인용합니다. 원문 인용에는 글자수 제한이 없습니다."

위 원문을 바탕으로 한 해설은 **반드시 200자 이내**로 작성합니다. 원문 인용 후 추가 해설만 200자를 초과하지 않습니다.

⚠️ 중요: 
- 근거원문과 해설을 모두 하나의 해설 섹션에 통합해서 작성하세요. 
- 별도의 근거원문 섹션은 만들지 마세요.
- 실수방지팁, 추가 설명, 유의사항 등은 절대 포함하지 마세요.
- 원문은 완전하게 인용하고, 해설은 핵심 내용만 200자 이내로 간결하게 작성하세요.

${pdfContent ? `

**📄 사용자 제공 자료:**
${pdfContent.substring(0, 10000)}

⚠️ 위 자료의 내용을 최우선으로 참고하여 답변하세요.` : ''}

**반드시 위 원칙과 형식을 준수하여 답변하세요.**`;

    const systemMessage = {
      role: 'system',
      content: systemContent
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
    
    // 요청 바디 생성 (모델별 파라미터 적용)
    const requestBody: any = {
      model: model,
      messages: conversationMessages,
      [maxTokensParam]: 1000,
    };

    // 온도 파라미터는 이전 모델에만 적용
    if (includeTemperature) {
      requestBody.temperature = 0.7;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const aiResponse = data.choices[0].message.content;
    
    // 토큰 사용량 정보 추출
    const usage = data.usage;
    console.log('Token usage:', usage);

    return new Response(JSON.stringify({ 
      response: aiResponse,
      usage: usage ? {
        input_tokens: usage.prompt_tokens,
        output_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens
      } : null,
      model: model,
    }), {
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