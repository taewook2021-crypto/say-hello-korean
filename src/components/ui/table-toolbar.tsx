import React from "react";
import { Button } from "./button";
import { Separator } from "./separator";
import { 
  Plus, 
  Minus, 
  Merge, 
  Split, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Bold,
  Italic,
  Palette,
  Square
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface TableToolbarProps {
  onAddRow: () => void;
  onRemoveRow: () => void;
  onAddColumn: () => void;
  onRemoveColumn: () => void;
  onMergeCells?: () => void;
  onSplitCell?: () => void;
  onAlignLeft?: () => void;
  onAlignCenter?: () => void;
  onAlignRight?: () => void;
  onToggleBold?: () => void;
  onToggleItalic?: () => void;
  onSetBorderStyle?: (style: string) => void;
  onSetBackgroundColor?: (color: string) => void;
  selectedCellsCount?: number;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  onAddRow,
  onRemoveRow,
  onAddColumn,
  onRemoveColumn,
  onMergeCells,
  onSplitCell,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onToggleBold,
  onToggleItalic,
  onSetBorderStyle,
  onSetBackgroundColor,
  selectedCellsCount = 0
}) => {
  const borderStyles = [
    { name: "기본", value: "1px solid #ddd" },
    { name: "굵게", value: "2px solid #333" },
    { name: "점선", value: "1px dashed #666" },
    { name: "테두리 없음", value: "none" }
  ];

  const backgroundColors = [
    { name: "기본", value: "transparent" },
    { name: "연한 회색", value: "#f8f9fa" },
    { name: "연한 파랑", value: "#e3f2fd" },
    { name: "연한 녹색", value: "#e8f5e8" },
    { name: "연한 노랑", value: "#fff9c4" }
  ];

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 border rounded-lg flex-wrap">
      {/* 행/열 조작 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddRow}
          className="h-8 w-8 p-0"
          title="행 추가"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemoveRow}
          className="h-8 w-8 p-0"
          title="행 삭제"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground mx-1">행</span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddColumn}
          className="h-8 w-8 p-0"
          title="열 추가"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemoveColumn}
          className="h-8 w-8 p-0"
          title="열 삭제"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground mx-1">열</span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 셀 병합/분할 */}
      {selectedCellsCount > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMergeCells}
            className="h-8 px-2"
            title="셀 병합"
          >
            <Merge className="h-4 w-4 mr-1" />
            병합
          </Button>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* 텍스트 정렬 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAlignLeft}
          className="h-8 w-8 p-0"
          title="왼쪽 정렬"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAlignCenter}
          className="h-8 w-8 p-0"
          title="가운데 정렬"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAlignRight}
          className="h-8 w-8 p-0"
          title="오른쪽 정렬"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 텍스트 스타일 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleBold}
          className="h-8 w-8 p-0"
          title="굵게"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleItalic}
          className="h-8 w-8 p-0"
          title="기울임"
        >
          <Italic className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 테두리 스타일 */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="테두리 스타일"
          >
            <Square className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground mb-2">테두리 스타일</div>
            {borderStyles.map((style) => (
              <Button
                key={style.value}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => onSetBorderStyle?.(style.value)}
              >
                {style.name}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* 배경색 */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="배경색"
          >
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground mb-2">배경색</div>
            {backgroundColors.map((color) => (
              <Button
                key={color.value}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => onSetBackgroundColor?.(color.value)}
              >
                <div 
                  className="w-3 h-3 rounded mr-2 border" 
                  style={{ backgroundColor: color.value }}
                />
                {color.name}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {selectedCellsCount > 0 && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <span className="text-xs text-muted-foreground">
            {selectedCellsCount}개 셀 선택됨
          </span>
        </>
      )}
    </div>
  );
};