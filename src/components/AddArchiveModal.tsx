import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Globe } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getTeacherPrompt } from '@/utils/aroFormatParser';

interface AddArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    sourceType: 'text' | 'pdf' | 'link';
    content: string;
    url: string;
  }) => void;
}

export const AddArchiveModal: React.FC<AddArchiveModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<'text' | 'pdf' | 'link'>('text');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [promptLanguage, setPromptLanguage] = useState<'KR' | 'EN'>('KR');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "제목 필요",
        description: "아카이브 제목을 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    if (sourceType === 'text' && !content.trim()) {
      toast({
        title: "내용 필요",
        description: "텍스트 내용을 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    if (sourceType === 'link' && !url.trim()) {
      toast({
        title: "URL 필요",
        description: "링크 URL을 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    onSubmit({
      title,
      description,
      sourceType,
      content,
      url
    });

    // Reset form
    setTitle('');
    setDescription('');
    setContent('');
    setUrl('');
  };

  const copyTeacherPrompt = async () => {
    try {
      const prompt = getTeacherPrompt(promptLanguage);
      await navigator.clipboard.writeText(prompt);
      toast({
        title: "프롬프트 복사됨",
        description: `${promptLanguage} 교사 프롬프트가 클립보드에 복사되었습니다`
      });
    } catch (error) {
      console.error('Failed to copy prompt:', error);
      toast({
        title: "복사 실패",
        description: "프롬프트 복사에 실패했습니다",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Archive</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Archive title"
              required
            />
          </div>

          <div>
            <Label htmlFor="sourceType">Source Type</Label>
            <Select value={sourceType} onValueChange={(value: 'text' | 'pdf' | 'link') => setSourceType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="link">Link</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sourceType === 'text' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="content">Content</Label>
                <div className="flex items-center gap-2">
                  <Select value={promptLanguage} onValueChange={(value: 'KR' | 'EN') => setPromptLanguage(value)}>
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KR">KR</SelectItem>
                      <SelectItem value="EN">EN</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyTeacherPrompt}
                    className="h-8"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Teacher Prompt
                  </Button>
                </div>
              </div>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste AI output exactly between ===ARO START=== and ===ARO END==="
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          )}

          {sourceType === 'link' && (
            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          )}

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Archive
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};