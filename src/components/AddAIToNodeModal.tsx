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
import { SummaryAndQAPreview } from '@/components/SummaryAndQAPreview';
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
      
      if (errors.length === 0 && (parsed.summary || (parsed.qaPairs && parsed.qaPairs.length > 0))) {
        setParsedData(parsed);
        setShowPreview(true);
      } else {
        toast.error(errors.length > 0 ? errors.join('\n') : '유효한 정리글 또는 Q&A 형식을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('파싱 오류:', error);
      toast.error('텍스트 파싱 중 오류가 발생했습니다.');
    }
  };

  const handleSaveToNode = async () => {
    if (!parsedData || !user) return;

    console.log('=== 저장 과정 시작 ===');
    console.log('사용자 ID:', user.id);
    console.log('노드 ID:', nodeId);
    console.log('파싱된 데이터:', parsedData);

    setIsLoading(true);
    try {
      // 1. 대화 생성
      console.log('1. 대화 생성 중...');
      const conversationData = {
        subject: nodeName,
        raw_text: inputText,
        user_id: user.id,
        lang: 'ko'
      };
      console.log('대화 데이터:', conversationData);

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single();

      if (convError) {
        console.error('대화 생성 실패:', convError);
        throw convError;
      }

      console.log('✅ 대화 생성 성공:', conversation);
      let savedItemsCount = 0;

      // 2. 정리글 저장 (있는 경우)
      if (parsedData.summary) {
        console.log('2. 정리글 저장 중...');
        const summaryData = {
          conversation_id: conversation.id,
          title: parsedData.summary.title,
          content: parsedData.summary.content,
          structure_type: parsedData.summary.structure_type || 'plain'
        };
        console.log('정리글 데이터:', summaryData);

        const { data: summaryResult, error: summaryError } = await supabase
          .from('summaries')
          .insert(summaryData)
          .select();

        if (summaryError) {
          console.error('정리글 저장 실패:', summaryError);
          throw summaryError;
        }

        console.log('✅ 정리글 저장 성공:', summaryResult);
        savedItemsCount += 1;
      } else {
        console.log('2. 정리글 없음 - 건너뛰기');
      }

      // 3. Q&A 쌍 저장 (있는 경우)
      if (parsedData.qaPairs && parsedData.qaPairs.length > 0) {
        console.log('3. Q&A 쌍 저장 중...');
        const qaInserts = parsedData.qaPairs.map((qa: any, index: number) => {
          const qaData = {
            conversation_id: conversation.id,
            q_text: qa.question,
            a_text: qa.answer,
            tags: qa.tags || [],
            difficulty: qa.level || 'basic',
            importance: 'medium'
          };
          console.log(`Q&A ${index + 1} 데이터:`, qaData);
          return qaData;
        });

        const { data: qaResults, error: qaError } = await supabase
          .from('qa_pairs')
          .insert(qaInserts)
          .select();

        if (qaError) {
          console.error('Q&A 저장 실패:', qaError);
          throw qaError;
        }

        console.log('✅ Q&A 저장 성공:', qaResults);
        savedItemsCount += parsedData.qaPairs.length;
      } else {
        console.log('3. Q&A 없음 - 건너뛰기');
      }

      // 4. 노드 아카이브에 추가
      console.log('4. 노드 아카이브 생성 중...');
      let contentSummary = '';
      if (parsedData.summary && parsedData.qaPairs?.length > 0) {
        contentSummary = `정리글 + ${parsedData.qaPairs.length}개의 Q&A`;
      } else if (parsedData.summary) {
        contentSummary = '학습 정리글';
      } else if (parsedData.qaPairs?.length > 0) {
        contentSummary = `${parsedData.qaPairs.length}개의 Q&A 쌍`;
      }

      const archiveData = {
        node_id: nodeId,
        conversation_id: conversation.id,
        title: archiveTitle || `AI 대화 - ${new Date().toLocaleDateString()}`,
        content_summary: contentSummary,
        archive_type: 'conversation'
      };
      console.log('아카이브 데이터:', archiveData);

      const { data: archiveResult, error: archiveError } = await supabase
        .from('node_archives')
        .insert(archiveData)
        .select();

      if (archiveError) {
        console.error('아카이브 저장 실패:', archiveError);
        throw archiveError;
      }

      console.log('✅ 아카이브 저장 성공:', archiveResult);
      console.log('=== 저장 과정 완료 ===');
      console.log(`총 저장된 항목: ${savedItemsCount}개`);

      toast.success(`${contentSummary}가 노드에 저장되었습니다.`);
      
      // 초기화
      setInputText('');
      setArchiveTitle('');
      setParsedData(null);
      setShowPreview(false);
      onContentAdded();
      onClose();
    } catch (error) {
      console.error('❌ 저장 실패:', error);
      toast.error('AI 대화 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPromptToClipboard = async () => {
    const promptText = "평문만 주세요(마크다운 금지). 아래 형식 그대로:\n1. 정리(제목/소제목/핵심 개념/상세 설명/체크리스트/기록 팁)\n2. Q&A(각 줄 Q./A.로 시작)\n하이픈(-), 숫자만 사용. '**', '_', '`', '#', '[]', '()' 등 금지.\n결과는 START~END 사이에만 작성.\n===START===\n===END===";

    try {
      await navigator.clipboard.writeText(promptText);
      toast.success('복사완료! 이제 AI에게 붙여넣기 하세요 📋');
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
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-hidden">
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
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="aiContent">AI 대화 내용</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPromptToClipboard}
                  className="h-8 px-3"
                >
                  📋 프롬프트 복사
                </Button>
              </div>
              <Textarea
                id="aiContent"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="AI에게 위 프롬프트를 보내고 받은 정리글과 Q&A 답변을 여기에 붙여넣기 하세요"
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="bg-muted/50 p-3 rounded-lg border text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span>💡</span>
                <span className="font-medium">팁</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                ChatGPT, Claude, Perplexity 등 어떤 AI든 사용 가능해요!<br/>
                모바일에서는 "정리글과 Q&A 카드로 동시에 만들어줘"라고 요청해보세요.
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
            <SummaryAndQAPreview 
              summary={parsedData.summary}
              qaPairs={parsedData.qaPairs || []} 
              detectedFormat={parsedData.detectedFormat}
              onSave={handleSaveToNode}
              onCancel={handleClosePreview}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};