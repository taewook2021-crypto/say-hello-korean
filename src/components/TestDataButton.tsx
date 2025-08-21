import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export const TestDataButton: React.FC = () => {
  const { user } = useAuth();

  const createTestData = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    console.log('=== 테스트 데이터 생성 시작 ===');
    console.log('현재 사용자 ID:', user.id);

    try {
      // 1. 테스트 대화 생성
      const testConversationData = {
        subject: '테스트 대화',
        raw_text: '이것은 테스트용 대화입니다.',
        user_id: user.id,
        lang: 'ko'
      };

      console.log('테스트 대화 데이터:', testConversationData);

      const { data: testConversation, error: convError } = await supabase
        .from('conversations')
        .insert(testConversationData)
        .select()
        .single();

      if (convError) {
        console.error('테스트 대화 생성 실패:', convError);
        throw convError;
      }

      console.log('✅ 테스트 대화 생성 성공:', testConversation);

      // 2. 테스트 정리글 생성
      const testSummaryData = {
        conversation_id: testConversation.id,
        title: '테스트 정리글',
        content: '이것은 테스트용 정리글 내용입니다.',
        structure_type: 'plain'
      };

      const { data: testSummary, error: summaryError } = await supabase
        .from('summaries')
        .insert(testSummaryData)
        .select();

      if (summaryError) {
        console.error('테스트 정리글 생성 실패:', summaryError);
      } else {
        console.log('✅ 테스트 정리글 생성 성공:', testSummary);
      }

      // 3. 테스트 Q&A 생성
      const testQAData = {
        conversation_id: testConversation.id,
        q_text: '테스트 질문입니다?',
        a_text: '테스트 답변입니다.',
        difficulty: 'basic',
        importance: 'medium',
        tags: ['테스트']
      };

      const { data: testQA, error: qaError } = await supabase
        .from('qa_pairs')
        .insert(testQAData)
        .select();

      if (qaError) {
        console.error('테스트 Q&A 생성 실패:', qaError);
      } else {
        console.log('✅ 테스트 Q&A 생성 성공:', testQA);
      }

      console.log('=== 테스트 데이터 생성 완료 ===');
      console.log('생성된 conversation ID:', testConversation.id);

      toast.success(`테스트 데이터 생성 완료! Conversation ID: ${testConversation.id.substring(0, 8)}...`);

    } catch (error) {
      console.error('❌ 테스트 데이터 생성 실패:', error);
      toast.error('테스트 데이터 생성에 실패했습니다.');
    }
  };

  const testQuery = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    console.log('=== 테스트 쿼리 실행 ===');
    
    try {
      // 현재 사용자의 모든 대화 조회
      const { data: allConversations, error: allError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('사용자의 모든 대화:', { allConversations, allError });

      if (allConversations && allConversations.length > 0) {
        const firstConv = allConversations[0];
        console.log('첫 번째 대화로 테스트 쿼리 실행:', firstConv.id);

        // 조인 쿼리 테스트
        const { data: joinResult, error: joinError } = await supabase
          .from('conversations')
          .select(`
            *,
            qa_pairs (*),
            summaries (*)
          `)
          .eq('id', firstConv.id)
          .maybeSingle();

        console.log('조인 쿼리 결과:', { joinResult, joinError });
      }

    } catch (error) {
      console.error('❌ 테스트 쿼리 실패:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      <Button onClick={createTestData} variant="outline" size="sm">
        🧪 테스트 데이터 생성
      </Button>
      <Button onClick={testQuery} variant="outline" size="sm">
        🔍 테스트 쿼리 실행
      </Button>
    </div>
  );
};