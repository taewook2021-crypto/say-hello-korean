import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, DollarSign, Clock, Sparkles, Brain, Bolt } from 'lucide-react';

interface ModelPricing {
  model_name: string;
  input_price_per_1k_tokens: number;
  output_price_per_1k_tokens: number;
  description: string;
  features: string[];
}

interface ModelSelectorProps {
  models: ModelPricing[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  allowedModels: string[];
  disabled?: boolean;
  calculateEstimatedCost: (modelName: string, tokens: number) => number;
}

const getModelIcon = (modelName: string) => {
  if (modelName.includes('gpt-5') && modelName.includes('nano')) {
    return <Bolt className="h-4 w-4 text-green-500" />;
  }
  if (modelName.includes('gpt-5')) {
    return <Sparkles className="h-4 w-4 text-purple-500" />;
  }
  if (modelName.includes('gpt-4.1')) {
    return <Brain className="h-4 w-4 text-blue-500" />;
  }
  return <Zap className="h-4 w-4 text-orange-500" />;
};

const getModelBadgeVariant = (modelName: string): "default" | "secondary" | "destructive" | "outline" => {
  if (modelName.includes('gpt-5')) return "default";
  if (modelName.includes('gpt-4.1')) return "secondary";
  return "outline";
};

const formatPrice = (price: number) => {
  if (price < 0.001) {
    return `$${(price * 1000000).toFixed(0)}/M토큰`;
  }
  return `$${price.toFixed(3)}/1K토큰`;
};

export default function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  allowedModels,
  disabled = false,
  calculateEstimatedCost
}: ModelSelectorProps) {
  const availableModels = models.filter(model => 
    allowedModels.includes(model.model_name)
  );

  const selectedModelData = models.find(m => m.model_name === selectedModel);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">GPT 모델 선택</label>
        {selectedModelData && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            예상 비용: {formatPrice(calculateEstimatedCost(selectedModel, 1000))}
          </div>
        )}
      </div>
      
      <Select
        value={selectedModel}
        onValueChange={onModelChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="모델을 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((model) => (
            <SelectItem key={model.model_name} value={model.model_name}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {getModelIcon(model.model_name)}
                  <span className="font-medium">{model.model_name}</span>
                  <Badge variant={getModelBadgeVariant(model.model_name)} className="text-xs">
                    {model.model_name.includes('gpt-5') && model.model_name.includes('nano') ? '초고속' :
                     model.model_name.includes('gpt-5') && model.model_name.includes('mini') ? '고속' :
                     model.model_name.includes('gpt-5') ? '최고성능' :
                     model.model_name.includes('gpt-4.1') ? '안정적' : '경제적'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground ml-2">
                  {formatPrice(model.input_price_per_1k_tokens)}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedModelData && (
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getModelIcon(selectedModelData.model_name)}
                <span className="font-medium text-sm">{selectedModelData.description}</span>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {selectedModelData.features.map((feature, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  입력: {formatPrice(selectedModelData.input_price_per_1k_tokens)}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  출력: {formatPrice(selectedModelData.output_price_per_1k_tokens)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}