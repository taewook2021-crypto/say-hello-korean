import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, FileText, Layout, Palette } from "lucide-react";

export interface PdfTemplate {
  id: string;
  name: string;
  category: 'cover' | 'paper';
  preview: string;
  description: string;
  isPremium?: boolean;
}

const templates: PdfTemplate[] = [
  // 표지 템플릿
  {
    id: 'classic-cover',
    name: '클래식',
    category: 'cover',
    preview: 'bg-gradient-to-br from-blue-50 to-blue-100',
    description: '깔끔하고 전통적인 디자인'
  },
  {
    id: 'modern-cover',
    name: '모던',
    category: 'cover',
    preview: 'bg-gradient-to-br from-slate-50 to-slate-100',
    description: '현대적이고 미니멀한 디자인'
  },
  {
    id: 'premium-cover',
    name: '프리미엄',
    category: 'cover',
    preview: 'bg-gradient-to-br from-purple-50 to-purple-100',
    description: '고급스럽고 우아한 디자인',
    isPremium: true
  },
  {
    id: 'academic-cover',
    name: '아카데믹',
    category: 'cover',
    preview: 'bg-gradient-to-br from-green-50 to-green-100',
    description: '학술적이고 전문적인 디자인'
  },
  {
    id: 'colorful-cover',
    name: '컬러풀',
    category: 'cover',
    preview: 'bg-gradient-to-br from-orange-50 to-pink-100',
    description: '활기차고 밝은 디자인'
  },
  
  // 종이 템플릿
  {
    id: 'lined-paper',
    name: '줄친 종이',
    category: 'paper',
    preview: 'bg-white border-2 border-blue-200',
    description: '기본 줄무늬 노트 형식'
  },
  {
    id: 'excel-paper',
    name: 'Excel',
    category: 'paper',
    preview: 'bg-white border-2 border-green-200',
    description: 'Excel 스타일 표 형식'
  }
];

interface PdfTemplateSelectorProps {
  onSelect: (coverTemplate: PdfTemplate, paperTemplate: PdfTemplate) => void;
  selectedCover?: PdfTemplate;
  selectedPaper?: PdfTemplate;
}

export function PdfTemplateSelector({ onSelect, selectedCover, selectedPaper }: PdfTemplateSelectorProps) {
  const [activeCover, setActiveCover] = useState<PdfTemplate>(selectedCover || templates.find(t => t.category === 'cover')!);
  const [activePaper, setActivePaper] = useState<PdfTemplate>(selectedPaper || templates.find(t => t.category === 'paper')!);

  const coverTemplates = templates.filter(t => t.category === 'cover');
  const paperTemplates = templates.filter(t => t.category === 'paper');

  const handleCoverSelect = (template: PdfTemplate) => {
    setActiveCover(template);
    // 표지 선택 시에는 onSelect 호출하지 않음
  };

  const handlePaperSelect = (template: PdfTemplate) => {
    setActivePaper(template);
    console.log('Paper template selected:', template.id);
    console.log('Current active cover:', activeCover.id);
    // 종이 템플릿 선택 시에만 다운로드 실행 - 현재 선택된 cover와 새로 선택한 paper 사용
    onSelect(activeCover, template);
  };

  const TemplateCard = ({ template, isSelected, onSelect: onSelectTemplate }: { 
    template: PdfTemplate; 
    isSelected: boolean; 
    onSelect: (template: PdfTemplate) => void;
  }) => (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:ring-1 hover:ring-muted-foreground/20'
      }`}
      onClick={() => onSelectTemplate(template)}
    >
      <CardContent className="p-3">
        <div className={`w-full h-24 rounded-md mb-3 ${template.preview} flex items-center justify-center relative`}>
          {template.category === 'paper' && (
            <div className="absolute inset-2">
              {template.id === 'lined-paper' && (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-0.5 bg-blue-300/50" />
                  ))}
                </div>
              )}
              {template.id === 'excel-paper' && (
                <div className="grid grid-cols-4 grid-rows-3 gap-0.5">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="border border-green-300/60 bg-green-50/30 h-3" />
                  ))}
                </div>
              )}
            </div>
          )}
          {template.category === 'cover' && (
            <div className="text-xs text-muted-foreground font-medium">
              {template.id === 'classic-cover' && <FileText className="w-6 h-6" />}
              {template.id === 'modern-cover' && <Layout className="w-6 h-6" />}
              {template.id === 'premium-cover' && <Palette className="w-6 h-6" />}
              {template.id === 'academic-cover' && <FileText className="w-6 h-6" />}
              {template.id === 'colorful-cover' && <Palette className="w-6 h-6" />}
            </div>
          )}
          {isSelected && (
            <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
          {template.isPremium && (
            <div className="absolute top-1 left-1">
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                Premium
              </Badge>
            </div>
          )}
        </div>
        <div>
          <h4 className="font-medium text-sm mb-1">{template.name}</h4>
          <p className="text-xs text-muted-foreground leading-tight">{template.description}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Tabs defaultValue="cover" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cover">표지</TabsTrigger>
          <TabsTrigger value="paper">종이</TabsTrigger>
        </TabsList>
        
        <TabsContent value="cover" className="mt-6">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {coverTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={activeCover.id === template.id}
                onSelect={handleCoverSelect}
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="paper" className="mt-6">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {paperTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={activePaper.id === template.id}
                onSelect={handlePaperSelect}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-center">
          <div>
            <p className="text-sm font-medium text-center">선택한 템플릿</p>
            <p className="text-xs text-muted-foreground text-center">
              표지: {activeCover.name} | 종이: {activePaper.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}