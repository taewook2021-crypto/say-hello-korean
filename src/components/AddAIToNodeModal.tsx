import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { parseAROFormat, validateParsedData } from '@/utils/aroParser';
import { ParsePreview } from '@/components/ParsePreview';
import { toast } from 'sonner';

interface AddAIToNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeName: string;
  onContentAdded: () => void;
}

export const AddAIToNodeModal: React.FC<AddAIToNodeModalProps> = ({
  isOpen,
  onClose,
  nodeId,
  nodeName,
  onContentAdded
}) => {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [archiveTitle, setArchiveTitle] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleParsePreview = () => {
    if (!inputText.trim()) {
      toast.error('AI 대화 내용을 입력해주세요.');
      return;
    }

    try {
      const parsed = parseAROFormat(inputText);
      const errors = validateParsedData(parsed);
      
      if (errors.length === 0 && parsed.qaPairs && parsed.qaPairs.length > 0) {
        setParsedData(parsed.qaPairs);
        setShowPreview(true);
      } else {
        toast.error(errors.length > 0 ? errors.join('\n') : '유효한 Q&A 형식을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('파싱 오류:', error);
      toast.error('텍스트 파싱 중 오류가 발생했습니다.');
    }
  };

  const handleSaveToNode = async () => {
    if (!parsedData || !user) return;

    setIsLoading(true);
    try {
      // 1. 대화 생성
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          subject: nodeName,
          raw_text: inputText,
          user_id: user.id,
          lang: 'ko'
        })
        .select()
        .single();

      if (convError) throw convError;

      // 2. Q&A 쌍 저장
      const qaInserts = parsedData.map((qa: any) => ({
        conversation_id: conversation.id,
        q_text: qa.question,
        a_text: qa.answer,
        tags: qa.tags,
        difficulty: qa.level || 'basic',
        importance: 'medium'
      }));

      const { error: qaError } = await supabase
        .from('qa_pairs')
        .insert(qaInserts);

      if (qaError) throw qaError;

      // 3. 노드 아카이브에 추가
      const { error: archiveError } = await supabase
        .from('node_archives')
        .insert({
          node_id: nodeId,
          conversation_id: conversation.id,
          title: archiveTitle || `AI 대화 - ${new Date().toLocaleDateString()}`,
          content_summary: `${parsedData.length}개의 Q&A 쌍`,
          archive_type: 'conversation'
        });

      if (archiveError) throw archiveError;

      toast.success(`${parsedData.length}개의 Q&A가 노드에 저장되었습니다.`);
      
      // 초기화
      setInputText('');
      setArchiveTitle('');
      setParsedData(null);
      setShowPreview(false);
      onContentAdded();
      onClose();
    } catch (error) {
      console.error('저장 실패:', error);
      toast.error('AI 대화 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPromptToClipboard = async () => {
    const promptText = `안녕하세요! 학습한 내용을 Q&A 형식으로 정리해 주세요.

다음 형식을 정확히 따라주세요:
Q. 질문내용?
A. 답변내용

Q: 다음 질문은?
A: 다음 답변

규칙:
- 질문은 'Q.' 또는 'Q:'로 시작
- 답변은 'A.' 또는 'A:'로 시작  
- 각 Q&A 쌍 사이에 빈 줄 추가
- 가능한 많은 Q&A 쌍으로 만들어 주세요

학습 내용: [여기에 학습한 내용을 입력하세요]`;

    try {
      await navigator.clipboard.writeText(promptText);
      toast.success('프롬프트가 클립보드에 복사되었습니다!');
    } catch (error) {
      toast.error('복사에 실패했습니다.');
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setParsedData(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {nodeName}에 AI 대화 추가
          </DialogTitle>
        </DialogHeader>
        
        {!showPreview ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="archiveTitle">아카이브 제목</Label>
              <input
                id="archiveTitle"
                type="text"
                value={archiveTitle}
                onChange={(e) => setArchiveTitle(e.target.value)}
                placeholder="아카이브 제목을 입력하세요 (선택사항)"
                className="w-full p-2 border border-input bg-background rounded-md"
              />
            </div>
            
            <div>
              <Label htmlFor="aiContent">AI 대화 내용</Label>
              <Textarea
                id="aiContent"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Q. 질문내용?&#10;A. 답변내용.&#10;&#10;Q. 다음 질문?&#10;A. 다음 답변."
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">AI에게 Q&A 정리 요청하기</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPromptToClipboard}
                  className="h-8 px-2"
                >
                  <Copy size={14} className="mr-1" />
                  복사
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                학습한 내용을 AI에게 보내고 위 버튼을 눌러 프롬프트를 복사한 후, AI에게 Q&A 형식으로 정리해달라고 요청하세요.
              </p>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button onClick={handleParsePreview} disabled={!inputText.trim()}>
                미리보기
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ParsePreview 
              qaPairs={parsedData} 
              detectedFormat="qa_pattern"
              totalCount={parsedData.length}
              onSave={handleSaveToNode}
              onCancel={handleClosePreview}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};