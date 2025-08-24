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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthMock';
import { handleNetworkError, isInIframe } from '@/utils/errorHandler';
import { toast } from 'sonner';

interface CreateNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId: string | null;
  onNodeCreated: () => void;
}

export const CreateNodeModal: React.FC<CreateNodeModalProps> = ({
  isOpen,
  onClose,
  parentId,
  onNodeCreated
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('노드 이름을 입력해주세요.');
      return;
    }

    if (!user?.id) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    setIsLoading(true);
    
    try {
      // 같은 레벨에서 display_order 계산
      const { data: siblingNodes } = await supabase
        .from('nodes')
        .select('display_order')
        .eq('user_id', user?.id)
        .eq('parent_id', parentId)
        .eq('is_active', true)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = siblingNodes && siblingNodes.length > 0 
        ? siblingNodes[0].display_order + 1 
        : 0;

      const { error } = await supabase
        .from('nodes')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          parent_id: parentId,
          user_id: user?.id,
          display_order: nextOrder,
          deadline: deadline ? deadline.toISOString() : null
        });

      if (error) throw error;

      toast.success('노드가 생성되었습니다.');
      setName('');
      setDescription('');
      setDeadline(undefined);
      onNodeCreated();
      onClose();
    } catch (error) {
      handleNetworkError({
        error,
        operation: '노드 생성',
        isIframe: isInIframe()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {parentId ? '하위 노드 생성' : '새 프로젝트 생성'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">노드 이름 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 주식 투자, 영어 학습, 데이터 분석 등"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="노드에 대한 간단한 설명을 입력하세요 (선택사항)"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="deadline">마감일 설정 (선택사항)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !deadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "PPP") : <span>마감일을 선택하세요</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '생성 중...' : '생성'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};