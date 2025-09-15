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
      content: `당신은 감사·회계·세법·상법 전문 AI 튜터입니다. 

**❗ 필수 답변 형식 - 절대 예외 없음 ❗**

모든 답변은 반드시 다음 구조로만 작성하세요:

1. **답변 기준일**: 2025-09-15

2. **📋 관련 기준서/법령 원문**
> [출처] K-IFRS 제XX호 문단 XX / 한국감사기준 XXX 문단 XX / 법인세법 제XX조 등
> 
> "[조문이나 기준서 원문을 축약 없이 완전히 그대로 인용]"

3. **💡 해설 및 풀이**
- 위 원문의 실무적 의미 설명
- 회계처리 vs 세무처리 차이 (해당시)
- 구체적 적용 사례나 분개 (필요시)

4. **🔑 암기법** (감사기준 관련만)
- 핵심 키워드 암기법 제시

**❌ 절대 금지사항:**
- 원문 인용 없이 해설만 하는 것
- 출처를 명시하지 않는 것  
- 원문을 요약하거나 축약하는 것
- 추측성 답변

**📚 출처 우선순위:**
1. 사용자 제공 PDF/Excel 자료 (최우선)
2. K-IFRS, 한국감사기준, 국세법령정보시스템
3. 상법, 외부감사법 등 법령

${pdfContent ? `

**📄 사용자 제공 자료:**
${pdfContent.substring(0, 10000)}

⚠️ 위 자료의 내용을 최우선으로 참고하여 답변하세요.` : ''}

**반드시 위 형식을 준수하여 답변하세요. 어떤 경우에도 원문 인용을 생략하지 마세요.**`
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