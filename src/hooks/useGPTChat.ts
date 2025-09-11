import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useGPTChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const sendMessage = useCallback(async (userMessage: string, pdfContent?: string) => {
    if (!userMessage.trim()) return;

    // 사용자 메시지 추가
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      // GPT API 호출을 위한 Edge Function 호출
      const { data, error } = await supabase.functions.invoke('chat-with-gpt', {
        body: {
          message: userMessage,
          pdfContent: pdfContent || '',
          messages: messages.slice(-10), // 최근 10개 메시지만 컨텍스트로 전송
        },
      });

      if (error) {
        console.error('GPT API 에러:', error);
        throw error;
      }

      // AI 응답 추가
      if (data?.response) {
        addMessage('assistant', data.response);
      } else {
        throw new Error('응답을 받지 못했습니다.');
      }
    } catch (error) {
      console.error('채팅 에러:', error);
      addMessage('assistant', '죄송합니다. 현재 서비스에 문제가 있습니다. 잠시 후 다시 시도해주세요.');
      toast.error('AI 응답을 가져오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [messages, addMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}