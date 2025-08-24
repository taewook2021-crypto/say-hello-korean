import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuthMock';
import { createReviewTask } from '@/utils/reviewScheduler';

interface AddAIToNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeName: string;
  onContentAdded: (conversationId: string) => void;
}

export const AddAIToNodeModal: React.FC<AddAIToNodeModalProps> = ({
  isOpen,
  onClose,
  nodeId,
  nodeName,
  onContentAdded
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const promptText = `평문만 주세요(마크다운 금지). 아래 형식 그대로:
1. 정리(제목/소제목/핵심 개념/상세 설명/체크리스트/기록 팁)
2. Q&A(각 줄 Q./A.로 시작)
하이픈(-), 숫자만 사용. "**", "_", "\`", "#", "[]", "()" 등 금지.
결과는 START~END 사이에만 작성.
===START===
===END===`;

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      console.log('💾 단순 저장 시작:', { title, content });

      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          title: title.trim(),
          content: content.trim(),
          node_id: nodeId
        })
        .select()
        .single();

      if (error) {
        console.error('❌ 저장 오류:', error);
        throw error;
      }

      console.log('✅ 저장 성공:', conversation);
      toast.success('대화가 성공적으로 저장되었습니다!');
      
      // 복습 일정 자동 생성 (Q&A 카드가 있는 경우)
      if (user?.id && title) {
        await createReviewTask(user.id, title);
      }
      
      // 저장 완료 후 대화보기 모달 열기
      onContentAdded(conversation.id);
      
      // 폼 초기화 및 모달 닫기
      setTitle('');
      setContent('');
      onClose();
      
    } catch (error) {
      console.error('💥 저장 실패:', error);
      toast.error('저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

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
          <DialogTitle>새 대화 추가 - {nodeName}</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">AI용 프롬프트</span>
            <Button
              onClick={handleCopy}
              size="sm"
              variant="outline"
            >
              {copied ? (
                <>
                  <Check size={14} className="mr-1" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy size={14} className="mr-1" />
                  복사
                </>
              )}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto bg-background p-2 rounded border">
            <pre className="whitespace-pre-wrap font-mono">{promptText}</pre>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="대화의 제목을 입력하세요..."
            />
          </div>
          
          <div>
            <Label htmlFor="content">내용</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="대화의 내용을 입력하세요..."
              rows={10}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? '저장 중...' : '저장'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};