import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Plus, Minus, Check, X } from 'lucide-react';

interface TableCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onTableCreate: (tableHtml: string) => void;
}

export const TableCreator: React.FC<TableCreatorProps> = ({
  isOpen,
  onClose,
  onTableCreate
}) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [tableData, setTableData] = useState<string[][]>([]);
  const [selectedCells, setSelectedCells] = useState<{start: {row: number, col: number}, end: {row: number, col: number}} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  // 표 데이터 초기화
  useEffect(() => {
    if (isOpen) {
      const newData = Array(rows).fill(null).map(() => Array(cols).fill(''));
      setTableData(newData);
      setSelectedCells(null);
    }
  }, [rows, cols, isOpen]);

  // 키보드 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !selectedCells) return;
      
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleDeleteSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedCells]);

  const updateCell = (row: number, col: number, value: string) => {
    const newData = [...tableData];
    newData[row][col] = value;
    setTableData(newData);
  };

  const addRow = () => {
    setRows(prev => prev + 1);
  };

  const addColumn = () => {
    setCols(prev => prev + 1);
  };

  const deleteRow = () => {
    if (rows > 1) {
      setRows(prev => prev - 1);
    }
  };

  const deleteColumn = () => {
    if (cols > 1) {
      setCols(prev => prev - 1);
    }
  };

  const handleMouseDown = (row: number, col: number) => {
    setIsDragging(true);
    setSelectedCells({ start: { row, col }, end: { row, col } });
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isDragging && selectedCells) {
      setSelectedCells({
        start: selectedCells.start,
        end: { row, col }
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDeleteSelection = () => {
    if (!selectedCells) return;

    const { start, end } = selectedCells;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    // 전체 행이 선택된 경우
    if (minCol === 0 && maxCol === cols - 1) {
      // 행 삭제
      const newData = tableData.filter((_, index) => index < minRow || index > maxRow);
      setTableData(newData);
      setRows(newData.length);
      setSelectedCells(null);
      return;
    }

    // 전체 열이 선택된 경우
    if (minRow === 0 && maxRow === rows - 1) {
      // 열 삭제
      const newData = tableData.map(row => 
        row.filter((_, index) => index < minCol || index > maxCol)
      );
      setTableData(newData);
      setCols(newData[0]?.length || 1);
      setSelectedCells(null);
      return;
    }

    // 선택된 셀들의 내용만 삭제
    const newData = [...tableData];
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (newData[row] && newData[row][col] !== undefined) {
          newData[row][col] = '';
        }
      }
    }
    setTableData(newData);
    setSelectedCells(null);
  };

  const isCellSelected = (row: number, col: number) => {
    if (!selectedCells) return false;
    const { start, end } = selectedCells;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  const generateTableHtml = () => {
    let html = '<table border="1" style="border-collapse: collapse; width: 100%;">\n';
    
    tableData.forEach((row, rowIndex) => {
      html += '  <tr>\n';
      row.forEach((cell, colIndex) => {
        html += `    <td style="border: 1px solid #ddd; padding: 8px;">${cell || '&nbsp;'}</td>\n`;
      });
      html += '  </tr>\n';
    });
    
    html += '</table>';
    return html;
  };

  const handleSave = () => {
    const tableHtml = generateTableHtml();
    onTableCreate(tableHtml);
    onClose();
  };

  const handleCancel = () => {
    setTableData([]);
    setSelectedCells(null);
    setRows(3);
    setCols(3);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>표 만들기</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 컨트롤 버튼들 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm">행:</span>
              <Button variant="outline" size="sm" onClick={deleteRow} disabled={rows <= 1}>
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-sm w-8 text-center">{rows}</span>
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">열:</span>
              <Button variant="outline" size="sm" onClick={deleteColumn} disabled={cols <= 1}>
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-sm w-8 text-center">{cols}</span>
              <Button variant="outline" size="sm" onClick={addColumn}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {selectedCells && (
              <Button variant="outline" size="sm" onClick={handleDeleteSelection}>
                <X className="w-4 h-4 mr-1" />
                선택 삭제
              </Button>
            )}
          </div>

          {/* 표 편집 영역 */}
          <div className="border rounded-lg p-4 max-h-96 overflow-auto">
            <table 
              ref={tableRef}
              className="w-full border-collapse"
              onMouseUp={handleMouseUp}
            >
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, colIndex) => (
                      <td
                        key={`${rowIndex}-${colIndex}`}
                        className={`border border-border p-1 ${
                          isCellSelected(rowIndex, colIndex) 
                            ? 'bg-blue-100 dark:bg-blue-900' 
                            : 'hover:bg-muted'
                        }`}
                        onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                        onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                      >
                        <Input
                          value={cell}
                          onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                          className="border-0 p-1 text-sm bg-transparent focus-visible:ring-0"
                          placeholder=""
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-muted-foreground">
            💡 팁: 드래그로 셀을 선택하고 백스페이스 키를 누르면 삭제됩니다.
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              취소
            </Button>
            <Button onClick={handleSave}>
              <Check className="w-4 h-4 mr-1" />
              표 삽입
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};