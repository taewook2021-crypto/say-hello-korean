import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';

interface PromptCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromptCopyModal: React.FC<PromptCopyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const promptText = `평문만 주세요(마크다운 금지). 아래 형식 그대로:
1. 정리(제목/소제목/핵심 개념/상세 설명/체크리스트/기록 팁)
2. Q&A(각 줄 Q./A.로 시작)
하이픈(-), 숫자만 사용. "**", "_", "\`", "#", "[]", "()" 등 금지.
결과는 START~END 사이에만 작성.
===START===
===END===`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      toast.success('프롬프트가 복사되었습니다!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('복사에 실패했습니다.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI 프롬프트 복사</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <ScrollArea className="h-64 w-full rounded-md border p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {promptText}
              </pre>
            </ScrollArea>
            
            <Button
              onClick={handleCopy}
              className="absolute top-2 right-2"
              size="sm"
              variant="outline"
            >
              {copied ? (
                <>
                  <Check size={16} className="mr-1" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy size={16} className="mr-1" />
                  복사
                </>
              )}
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            위 프롬프트를 복사하여 AI에게 붙여넣기하면 학습 자료를 정해진 형식으로 받을 수 있습니다.
          </p>
        </div>
        
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>닫기</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};