import React, { useState } from 'react';
import { Table } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface TableSizeSelectorProps {
  onTableCreate: (rows: number, cols: number) => void;
  disabled?: boolean;
}

export const TableSizeSelector: React.FC<TableSizeSelectorProps> = ({ 
  onTableCreate, 
  disabled = false 
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const maxRows = 8;
  const maxCols = 8;

  const handleCellHover = (row: number, col: number) => {
    setHoveredCell({ row, col });
  };

  const handleCellClick = (row: number, col: number) => {
    onTableCreate(row + 1, col + 1);
    setIsOpen(false);
    setHoveredCell(null);
  };

  const renderGrid = () => {
    const cells = [];
    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < maxCols; col++) {
        const isSelected = hoveredCell && row <= hoveredCell.row && col <= hoveredCell.col;
        cells.push(
          <div
            key={`${row}-${col}`}
            className={`w-4 h-4 border border-border cursor-pointer transition-colors ${
              isSelected ? 'bg-primary' : 'bg-background hover:bg-accent'
            }`}
            onMouseEnter={() => handleCellHover(row, col)}
            onClick={() => handleCellClick(row, col)}
          />
        );
      }
    }
    return cells;
  };

  const getSizeText = () => {
    if (!hoveredCell) return '표 삽입';
    return `${hoveredCell.col + 1}x${hoveredCell.row + 1} 표`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Table className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-3">
          <div className="text-sm font-medium text-foreground">
            {getSizeText()}
          </div>
          <div
            className="grid grid-cols-8 gap-px bg-border p-1 rounded"
            onMouseLeave={() => setHoveredCell(null)}
          >
            {renderGrid()}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};