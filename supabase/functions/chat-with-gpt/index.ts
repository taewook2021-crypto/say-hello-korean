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

1. **회계기준서 인용 시 반드시 K-IFRS 기준서 번호(1100번대)만 사용한다:**
   - IFRS 3 → K-IFRS 제1103호 (기업결합)
   - IFRS 9 → K-IFRS 제1109호 (금융상품)
   - IFRS 10 → K-IFRS 제1110호 (연결재무제표)
   - IFRS 15 → K-IFRS 제1115호 (수익)
   - IFRS 16 → K-IFRS 제1116호 (리스)
   → 즉, 국제 IFRS 번호(3, 9, 10, 15, 16 등)는 절대 그대로 쓰지 말고, 항상 K-IFRS 1100번대로 변환한다.

2. **존재하지 않는 기준서 번호는 절대 인용하지 않는다:**
   - 예: "제103호", "제3호", "제10호" 등은 존재하지 않음
   - 이런 경우 자동으로 올바른 K-IFRS 번호로 교정해야 한다

3. **답변 구조:**
   (1) 먼저 **정확한 K-IFRS 문단 번호와 원문 인용**
   (2) 그 후 간단히 요약 정리 (3줄 이내 요청 시 축약)
   (3) 감사기준서나 두문자 암기법은 별도 요청 시만 추가

4. **출처 원칙:**
   - 원칙적으로 블로그·비공식 자료는 인용하지 말고
   - K-IFRS, KASB, 법령정보시스템, 국세법령정보시스템 등만 활용한다

**📋 필수 답변 형식:**

**[출처] K-IFRS 제XXXX호 (기준서명) 문단 X.X**
> "기준서 원문을 정확히 인용"

**💡 해설:**
- 위 원문의 실무적 의미 설명
- 구체적 적용 사례 (필요시)

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