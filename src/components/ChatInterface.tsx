import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ModelSelector from './ModelSelector';
import UsageIndicator from './UsageIndicator';
import { useUsageTracking } from '@/hooks/useUsageTracking';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onSendMessage?: (message: string, model?: string) => void;
  isLoading?: boolean;
  messages?: Message[];
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export default function ChatInterface({ 
  onSendMessage, 
  isLoading = false, 
  messages = [], 
  selectedModel = 'gpt-4o-mini',
  onModelChange 
}: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const {
    usageData,
    modelPricing,
    currentTier,
    checkUsageLimits,
    calculateEstimatedCost,
    getAllowedModels,
  } = useUsageTracking();

  // 컴포넌트 마운트 시 사용량 확인
  useEffect(() => {
    checkUsageLimits();
  }, [checkUsageLimits]);

  // 새 메시지가 추가될 때 스크롤을 맨 아래로
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isLoading) return;
    
    // 사용량 제한 확인
    if (usageData && !usageData.can_ask) {
      return; // 사용량 초과 시 전송 차단
    }
    
    onSendMessage?.(inputMessage.trim(), selectedModel);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex gap-4">
      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0 pb-3">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              AI 어시스턴트
            </CardTitle>
            <p className="text-sm text-gray-600">학습 내용에 대해 질문하세요</p>
          </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 gap-4">
        {/* 메시지 영역 */}
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">학습 내용이 로드되면 질문할 수 있습니다.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.role === 'assistant' && (
                        <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      {message.role === 'user' && (
                        <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* 로딩 인디케이터 */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">응답 생성 중...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

          {/* 입력 영역 */}
          <div className="flex-shrink-0 flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                usageData && !usageData.can_ask 
                  ? "사용 한도에 도달했습니다" 
                  : "학습 내용에 대해 질문하세요..."
              }
              disabled={isLoading || (usageData && !usageData.can_ask)}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading || (usageData && !usageData.can_ask)}
              size="sm"
              className="px-3"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* 사이드바: 모델 선택 및 사용량 */}
      <div className="w-80 space-y-4">
        <Card>
          <CardContent className="p-4">
            <ModelSelector
              models={modelPricing}
              selectedModel={selectedModel}
              onModelChange={onModelChange || (() => {})}
              allowedModels={getAllowedModels()}
              disabled={isLoading}
              calculateEstimatedCost={calculateEstimatedCost}
            />
          </CardContent>
        </Card>

        <UsageIndicator
          usageData={usageData}
          currentTier={currentTier}
          isLoading={false}
        />
      </div>
    </div>
  );
}