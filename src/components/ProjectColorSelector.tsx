import React from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface ProjectColorSelectorProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

const PROJECT_COLORS = [
  { value: '#3b82f6', name: '파랑', class: 'bg-blue-500' },
  { value: '#ef4444', name: '빨강', class: 'bg-red-500' },
  { value: '#10b981', name: '초록', class: 'bg-green-500' },
  { value: '#f59e0b', name: '주황', class: 'bg-amber-500' },
  { value: '#8b5cf6', name: '보라', class: 'bg-violet-500' },
  { value: '#f97316', name: '오렌지', class: 'bg-orange-500' },
  { value: '#06b6d4', name: '청록', class: 'bg-cyan-500' },
];

export const ProjectColorSelector: React.FC<ProjectColorSelectorProps> = ({
  selectedColor,
  onColorSelect
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">프로젝트 색상</label>
      <div className="flex gap-2 flex-wrap">
        {PROJECT_COLORS.map((color) => (
          <Button
            key={color.value}
            variant="outline"
            size="sm"
            className={`w-8 h-8 p-0 border-2 relative ${color.class} ${
              selectedColor === color.value ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
            onClick={() => onColorSelect(color.value)}
            title={color.name}
          >
            {selectedColor === color.value && (
              <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
};