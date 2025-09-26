import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Button } from './button';
import { Editor } from '@tiptap/react';

interface TableOverlayProps {
  editor: Editor;
  tableElement: HTMLElement | null;
}

export const TableOverlay: React.FC<TableOverlayProps> = ({ editor, tableElement }) => {
  const [columnButtonPosition, setColumnButtonPosition] = useState({ top: 0, left: 0 });
  const [rowButtonPosition, setRowButtonPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ row: number; col: number } | null>(null);
  const [selectedCells, setSelectedCells] = useState<HTMLElement[]>([]);
  const [deleteButtonPosition, setDeleteButtonPosition] = useState({ top: 0, left: 0 });
  const [deleteType, setDeleteType] = useState<'row' | 'column' | null>(null);
  
  const overlayRef = useRef<HTMLDivElement>(null);

  const getCellPosition = useCallback((cell: HTMLElement) => {
    const row = cell.closest('tr');
    const table = cell.closest('table');
    if (!row || !table) return null;
    
    const rowIndex = Array.from(table.querySelectorAll('tr')).indexOf(row);
    const colIndex = Array.from(row.children).indexOf(cell);
    return { row: rowIndex, col: colIndex };
  }, []);

  const clearSelection = useCallback(() => {
    selectedCells.forEach(cell => {
      cell.style.backgroundColor = '';
      cell.style.outline = '';
    });
    setSelectedCells([]);
    setDeleteType(null);
  }, [selectedCells]);

  const updateSelection = useCallback((start: { row: number; col: number }, end: { row: number; col: number }) => {
    if (!tableElement) return;
    
    clearSelection();
    
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    const rows = tableElement.querySelectorAll('tr');
    const cells: HTMLElement[] = [];
    
    for (let r = minRow; r <= maxRow; r++) {
      const row = rows[r];
      if (row) {
        for (let c = minCol; c <= maxCol; c++) {
          const cell = row.children[c] as HTMLElement;
          if (cell) {
            cell.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
            cell.style.outline = '2px solid rgb(59, 130, 246)';
            cells.push(cell);
          }
        }
      }
    }
    
    setSelectedCells(cells);
    console.log('Selection updated:', { minRow, maxRow, minCol, maxCol, cellsCount: cells.length });
    
    // 삭제 버튼 표시 여부 결정
    analyzeSelection(start, end);
  }, [tableElement, clearSelection]);

  const analyzeSelection = useCallback((start: { row: number; col: number }, end: { row: number; col: number }) => {
    if (!tableElement) return;
    
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    const rows = tableElement.querySelectorAll('tr');
    const totalRows = rows.length;
    const totalCols = rows[0]?.children.length || 0;
    
    const isFullRowSelection = minCol === 0 && maxCol === totalCols - 1;
    const isFullColumnSelection = minRow === 0 && maxRow === totalRows - 1;
    
    const tableRect = tableElement.getBoundingClientRect();
    
    if (isFullRowSelection && !isFullColumnSelection) {
      setDeleteType('row');
      const middleRow = Math.floor((minRow + maxRow) / 2);
      const middleRowElement = rows[middleRow];
      if (middleRowElement) {
        const firstCell = middleRowElement.children[0] as HTMLElement;
        if (firstCell) {
          const cellRect = firstCell.getBoundingClientRect();
          setDeleteButtonPosition({
            top: cellRect.top - tableRect.top + (cellRect.height / 2) - 12,
            left: -60
          });
        }
      }
    } else if (isFullColumnSelection && !isFullRowSelection) {
      setDeleteType('column');
      const middleCol = Math.floor((minCol + maxCol) / 2);
      const firstRow = rows[0];
      if (firstRow) {
        const middleColElement = firstRow.children[middleCol] as HTMLElement;
        if (middleColElement) {
          const cellRect = middleColElement.getBoundingClientRect();
          setDeleteButtonPosition({
            top: -60,
            left: cellRect.left - tableRect.left + (cellRect.width / 2) - 12
          });
        }
      }
    } else {
      setDeleteType(null);
    }
  }, [tableElement]);

  const updateButtonPositions = useCallback(() => {
    if (!tableElement) return;
    
    const tableRect = tableElement.getBoundingClientRect();
    
    setColumnButtonPosition({
      top: -35,
      left: tableRect.width / 2 - 12
    });
    
    setRowButtonPosition({
      top: tableRect.height / 2 - 12,
      left: -35
    });
  }, [tableElement]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!tableElement) return;
    
    const target = e.target as HTMLElement;
    const cell = target.closest('td, th') as HTMLElement;
    
    if (!cell || !tableElement.contains(cell)) return;
    if (target.closest('.table-button')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const position = getCellPosition(cell);
    if (position) {
      console.log('Mouse down on cell:', position);
      setIsDragging(true);
      setDragStart(position);
      setDragEnd(position);
      clearSelection();
      updateSelection(position, position);
    }
  }, [tableElement, getCellPosition, clearSelection, updateSelection]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStart) return;
    
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    const cell = target?.closest('td, th') as HTMLElement;
    
    if (cell && tableElement?.contains(cell)) {
      const position = getCellPosition(cell);
      if (position && (position.row !== dragEnd?.row || position.col !== dragEnd?.col)) {
        console.log('Mouse move to cell:', position);
        setDragEnd(position);
        updateSelection(dragStart, position);
      }
    }
  }, [isDragging, dragStart, dragEnd, tableElement, getCellPosition, updateSelection]);

  const handleMouseUp = useCallback(() => {
    console.log('Mouse up, stopping drag');
    setIsDragging(false);
  }, []);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!tableElement?.contains(target) && !target.closest('.table-button')) {
      clearSelection();
    }
  }, [tableElement, clearSelection]);

  useEffect(() => {
    if (!tableElement) {
      setIsVisible(false);
      clearSelection();
      return;
    }

    console.log('TableOverlay mounted with table:', tableElement);
    updateButtonPositions();
    setIsVisible(true);
    
    // 전역 이벤트 리스너 등록
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('click', handleClickOutside);
    
    const resizeObserver = new ResizeObserver(updateButtonPositions);
    resizeObserver.observe(tableElement);
    
    window.addEventListener('scroll', updateButtonPositions);
    window.addEventListener('resize', updateButtonPositions);

    return () => {
      console.log('TableOverlay cleanup');
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('click', handleClickOutside);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateButtonPositions);
      window.removeEventListener('resize', updateButtonPositions);
      clearSelection();
    };
  }, [tableElement, handleMouseDown, handleMouseMove, handleMouseUp, handleClickOutside, updateButtonPositions, clearSelection]);

  const handleAddColumn = () => {
    editor.chain().focus().addColumnAfter().run();
  };

  const handleAddRow = () => {
    editor.chain().focus().addRowAfter().run();
  };

  const handleDelete = () => {
    if (deleteType === 'row') {
      editor.chain().focus().deleteRow().run();
    } else if (deleteType === 'column') {
      editor.chain().focus().deleteColumn().run();
    }
    clearSelection();
  };

  if (!isVisible || !tableElement) return null;

  return (
    <div ref={overlayRef} className="relative">
      {/* 열 추가 버튼 */}
      <div
        className="absolute z-50 table-button"
        style={{
          top: `${columnButtonPosition.top}px`,
          left: `${columnButtonPosition.left}px`
        }}
      >
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0 bg-background border border-border shadow-sm hover:bg-accent"
          onClick={handleAddColumn}
          title="열 추가"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* 행 추가 버튼 */}
      <div
        className="absolute z-50 table-button"
        style={{
          top: `${rowButtonPosition.top}px`,
          left: `${rowButtonPosition.left}px`
        }}
      >
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0 bg-background border border-border shadow-sm hover:bg-accent"
          onClick={handleAddRow}
          title="행 추가"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* 삭제 버튼 */}
      {deleteType && (
        <div
          className="absolute z-50 table-button"
          style={{
            top: `${deleteButtonPosition.top}px`,
            left: `${deleteButtonPosition.left}px`
          }}
        >
          <Button
            variant="destructive"
            size="sm"
            className="h-6 w-6 p-0 shadow-sm"
            onClick={handleDelete}
            title={deleteType === 'row' ? '행 삭제' : '열 삭제'}
          >
            <Minus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};