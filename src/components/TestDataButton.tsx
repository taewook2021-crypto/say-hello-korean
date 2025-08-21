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
    console.log('=== 사용자 인증 상태 확인 ===');
    
    try {
      // 1. useAuth에서 가져온 사용자 정보
      console.log('1. useAuth에서 가져온 사용자:', user);
      
      // 2. Supabase에서 직접 가져온 사용자 정보
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      console.log('2. supabase.auth.getUser() 결과:', { authUser, authError });
      
      // 3. 현재 세션 정보
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('3. 현재 세션:', { session, sessionError });
      
      if (!authUser) {
        console.error('❌ 사용자가 로그인되어 있지 않음');
        toast.error('로그인이 필요합니다.');
        return;
      }

      // 4. 해당 사용자 ID로 저장된 모든 대화 조회
      console.log('4. 사용자 ID로 대화 조회:', authUser.id);
      const { data: allConversations, error: allError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('사용자의 모든 대화:', { allConversations, allError });

      // 5. 모든 대화를 user_id 구분없이 조회 (RLS 우회 확인용)
      console.log('5. 모든 대화 조회 (RLS 정책 확인용)...');
      const { data: allConversationsNoFilter, error: allNoFilterError } = await supabase
        .from('conversations')
        .select('id, subject, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      console.log('전체 대화 목록:', { allConversationsNoFilter, allNoFilterError });

      // 6. node_archives와 conversations 조인 쿼리 테스트
      if (allConversations && allConversations.length > 0) {
        const firstConv = allConversations[0];
        console.log('6. 첫 번째 대화로 조인 쿼리 테스트:', firstConv.id);

        // node_archives에서 해당 conversation_id 찾기
        const { data: archiveCheck, error: archiveCheckError } = await supabase
          .from('node_archives')
          .select('*')
          .eq('conversation_id', firstConv.id);

        console.log('해당 대화의 아카이브:', { archiveCheck, archiveCheckError });

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
        
        if (joinError) {
          console.error('조인 쿼리 실패:', joinError);
          if (joinError.code === 'PGRST301') {
            console.log('🚨 RLS 정책에 의해 접근 거부됨');
          }
        }
      }

      // 7. 직접 특정 conversation_id로 테스트
      console.log('7. 알려진 conversation ID로 직접 테스트...');
      const knownConversationId = 'f3fba464-9191-4982-8807-9803a1e381fe'; // DB에서 확인된 ID
      
      const { data: directTest, error: directTestError } = await supabase
        .from('conversations')
        .select(`
          *,
          qa_pairs (*),
          summaries (*)
        `)
        .eq('id', knownConversationId)
        .maybeSingle();

      console.log('직접 ID 테스트 결과:', { directTest, directTestError });

    } catch (error) {
      console.error('❌ 테스트 쿼리 실패:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      <Button onClick={createTestData} variant="outline" size="sm">
        🧪 테스트 데이터 생성
      </Button>
      <Button onClick={testQuery} variant="outline" size="sm">
        🔍 인증 상태 확인
      </Button>
    </div>
  );
};