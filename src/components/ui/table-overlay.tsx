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
  
  const isMouseDownRef = useRef(false);

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
      cell.style.border = '';
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
            cell.style.backgroundColor = 'rgba(59, 130, 246, 0.4)';
            cell.style.border = '2px solid rgb(59, 130, 246)';
            cell.style.boxSizing = 'border-box';
            cells.push(cell);
          }
        }
      }
    }
    
    setSelectedCells(cells);
    console.log('Selection updated:', { minRow, maxRow, minCol, maxCol, cellsCount: cells.length });
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
    
    const editorContainer = editor.view.dom.closest('.ProseMirror');
    const containerRect = editorContainer?.getBoundingClientRect();
    
    if (!containerRect) return;
    
    console.log('Analyzing selection:', { isFullRowSelection, isFullColumnSelection, minRow, maxRow, minCol, maxCol });
    
    if (isFullRowSelection && !isFullColumnSelection) {
      setDeleteType('row');
      const middleRow = Math.floor((minRow + maxRow) / 2);
      const middleRowElement = rows[middleRow];
      if (middleRowElement) {
        const firstCell = middleRowElement.children[0] as HTMLElement;
        if (firstCell) {
          const cellRect = firstCell.getBoundingClientRect();
          setDeleteButtonPosition({
            top: cellRect.top - containerRect.top + (cellRect.height / 2) - 12,
            left: cellRect.left - containerRect.left - 60
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
            top: cellRect.top - containerRect.top - 60,
            left: cellRect.left - containerRect.left + (cellRect.width / 2) - 12
          });
        }
      }
    } else {
      setDeleteType(null);
    }
  }, [tableElement, editor]);

  const updateButtonPositions = useCallback(() => {
    if (!tableElement) return;
    
    const editorContainer = editor.view.dom.closest('.ProseMirror');
    const containerRect = editorContainer?.getBoundingClientRect();
    
    if (containerRect) {
      const firstCell = tableElement.querySelector('tr:first-child td:first-child, tr:first-child th:first-child') as HTMLElement;
      
      if (firstCell) {
        const cellRect = firstCell.getBoundingClientRect();
        
        setColumnButtonPosition({
          top: cellRect.top - containerRect.top - 30,
          left: cellRect.left - containerRect.left + (cellRect.width / 2) - 12
        });
        
        setRowButtonPosition({
          top: cellRect.top - containerRect.top + (cellRect.height / 2) - 12,
          left: cellRect.left - containerRect.left - 30
        });
      }
    }
  }, [tableElement, editor]);

  // 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((event: Event) => {
    const mouseEvent = event as MouseEvent;
    const target = mouseEvent.target as HTMLElement;
    
    if (!tableElement || !tableElement.contains(target)) return;
    if (target.closest('.table-button')) return; // 버튼 클릭은 제외
    
    if (target.tagName === 'TD' || target.tagName === 'TH') {
      event.preventDefault();
      event.stopPropagation();
      
      const position = getCellPosition(target);
      if (position) {
        console.log('Starting drag at:', position);
        setIsDragging(true);
        setDragStart(position);
        setDragEnd(position);
        isMouseDownRef.current = true;
        clearSelection();
        updateSelection(position, position);
      }
    }
  }, [tableElement, getCellPosition, clearSelection, updateSelection]);

  const handleMouseMove = useCallback((event: Event) => {
    if (!isDragging || !dragStart || !isMouseDownRef.current) return;
    
    const mouseEvent = event as MouseEvent;
    const target = document.elementFromPoint(mouseEvent.clientX, mouseEvent.clientY) as HTMLElement;
    
    if (target && (target.tagName === 'TD' || target.tagName === 'TH') && tableElement?.contains(target)) {
      const position = getCellPosition(target);
      if (position && (position.row !== dragEnd?.row || position.col !== dragEnd?.col)) {
        console.log('Dragging to:', position);
        setDragEnd(position);
        updateSelection(dragStart, position);
      }
    }
  }, [isDragging, dragStart, dragEnd, tableElement, getCellPosition, updateSelection]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart && dragEnd) {
      console.log('Drag ended, analyzing selection');
      analyzeSelection(dragStart, dragEnd);
    }
    setIsDragging(false);
    isMouseDownRef.current = false;
  }, [isDragging, dragStart, dragEnd, analyzeSelection]);

  const handleClickOutside = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    if (!tableElement?.contains(target) && !target.closest('.table-button')) {
      clearSelection();
    }
  }, [tableElement, clearSelection]);

  useEffect(() => {
    if (!tableElement) {
      setIsVisible(false);
      return;
    }

    updateButtonPositions();
    setIsVisible(true);
    
    // 이벤트 리스너 등록
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('click', handleClickOutside);
    
    const resizeObserver = new ResizeObserver(updateButtonPositions);
    resizeObserver.observe(tableElement);
    
    window.addEventListener('scroll', updateButtonPositions);
    window.addEventListener('resize', updateButtonPositions);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('click', handleClickOutside);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateButtonPositions);
      window.removeEventListener('resize', updateButtonPositions);
    };
  }, [tableElement, handleMouseDown, handleMouseMove, handleMouseUp, handleClickOutside, updateButtonPositions]);

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

  if (!isVisible) return null;

  return (
    <>
      {/* 열 추가 버튼 */}
      <div
        className="absolute z-50"
        style={{
          top: `${columnButtonPosition.top}px`,
          left: `${columnButtonPosition.left}px`
        }}
      >
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0 bg-background border border-border shadow-sm hover:bg-accent table-button"
          onClick={handleAddColumn}
          title="열 추가"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* 행 추가 버튼 */}
      <div
        className="absolute z-50"
        style={{
          top: `${rowButtonPosition.top}px`,
          left: `${rowButtonPosition.left}px`
        }}
      >
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0 bg-background border border-border shadow-sm hover:bg-accent table-button"
          onClick={handleAddRow}
          title="행 추가"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* 삭제 버튼 */}
      {deleteType && (
        <div
          className="absolute z-50"
          style={{
            top: `${deleteButtonPosition.top}px`,
            left: `${deleteButtonPosition.left}px`
          }}
        >
          <Button
            variant="destructive"
            size="sm"
            className="h-6 w-6 p-0 shadow-sm table-button"
            onClick={handleDelete}
            title={deleteType === 'row' ? '행 삭제' : '열 삭제'}
          >
            <Minus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </>
  );
};