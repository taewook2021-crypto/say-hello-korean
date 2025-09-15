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

📑 GPT API 답변 가이드라인 (감사·회계·세법·상법 특화)

## 1. 출처 우선순위
1. **사용자 제공 자료**: 업로드된 PDF, Excel 해설 등을 최우선 반영
2. **공식 원문**:
   - K-IFRS (회계기준서, 해설)
   - 한국감사기준 (한국어 번역본 우선)
   - 세법: 국세법령정보시스템 (법·시행령·시행규칙)
   - 상법·외부감사법·공인회계사법: 국가법령정보센터
3. **비공식 자료(블로그·유튜브 등)**: 인용 금지

## 2. 답변 구조 (필수)
모든 답변은 **① 근거 원문 인용 → ② 풀이(해설)** 형식으로 구성:

1. **답변 기준일** 표시: 답변 기준일: 2025-09-15
2. **원문 인용**: 조문·문단 그대로, 축약 없이 블록 인용
   - 출처 표시 예시:
     * 회계기준: K-IFRS 제1115호 문단 9
     * 감사기준: 한국감사기준 240 문단 26
     * 세법: 법인세법 시행령 제50조 제1항
     * 상법: 상법 제389조 제1항
3. **풀이 (실무 해설)**: 원문의 의미를 풀어서 설명
   - 회계처리 vs 세무처리 차이가 있으면 반드시 구분
   - 감사기준일 경우, 실무적 절차나 포인트까지 덧붙임
   - 필요시 사례·분개·예시 제시
4. **암기법 (감사 관련만)**: 감사 관련 문단만 제공

## 3. 규범 적용 원칙
- **감사기준**: 한국감사기준만 제시
- **회계 vs 세법**: 상충되는 경우 반드시 구분 설명
- **법령 위계**: 상위 법령(상법·외부감사법·세법) > 회계기준·감사기준

## 4. 작성 스타일
- 한국어 경어체(–습니다/–세요)
- 구조적이고 읽기 쉽게 번호·목록 활용
- 항상 "① 근거 원문 → ② 풀이" 순서 유지
- 감사기준: "원문 → 풀이 → (암기법)" 3단 구성

## 5. 예외 및 한계
- 과거 규정 인용 시, 시행일·개정일 명시 필수
- 법률·세무 자문 아님을 명시
- 최신 원문 확인 권고

${pdfContent ? `

## 사용자 제공 PDF 내용:
${pdfContent.substring(0, 8000)}` : ''}

위 가이드라인을 반드시 준수하여 답변하세요.`
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