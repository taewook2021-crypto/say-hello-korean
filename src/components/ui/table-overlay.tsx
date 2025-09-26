import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!tableElement) {
      setIsVisible(false);
      return;
    }

    const updateButtonPositions = () => {
      const editorContainer = editor.view.dom.closest('.ProseMirror');
      const containerRect = editorContainer?.getBoundingClientRect();
      
      if (containerRect) {
        // 맨 첫 번째 셀 (좌상단) 찾기
        const firstCell = tableElement.querySelector('tr:first-child td:first-child, tr:first-child th:first-child') as HTMLElement;
        
        if (firstCell) {
          const cellRect = firstCell.getBoundingClientRect();
          
          // 열 추가 버튼 위치 (첫 번째 셀 위쪽)
          setColumnButtonPosition({
            top: cellRect.top - containerRect.top - 30,
            left: cellRect.left - containerRect.left + (cellRect.width / 2) - 12
          });
          
          // 행 추가 버튼 위치 (첫 번째 셀 왼쪽)
          setRowButtonPosition({
            top: cellRect.top - containerRect.top + (cellRect.height / 2) - 12,
            left: cellRect.left - containerRect.left - 30
          });
        }
      }
    };

    const getCellPosition = (cell: HTMLElement) => {
      const row = cell.closest('tr');
      const table = cell.closest('table');
      if (!row || !table) return null;
      
      const rowIndex = Array.from(table.querySelectorAll('tr')).indexOf(row);
      const colIndex = Array.from(row.children).indexOf(cell);
      return { row: rowIndex, col: colIndex };
    };

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if ((target.tagName === 'TD' || target.tagName === 'TH') && tableElement.contains(target)) {
        event.preventDefault();
        console.log('Mouse down on cell:', target);
        const position = getCellPosition(target);
        if (position) {
          console.log('Start position:', position);
          setIsDragging(true);
          setDragStart(position);
          setDragEnd(position);
          clearSelection();
          updateSelection(position, position);
        }
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging || !dragStart) return;
      
      const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement;
      if (target && (target.tagName === 'TD' || target.tagName === 'TH') && tableElement.contains(target)) {
        const position = getCellPosition(target);
        if (position && (position.row !== dragEnd?.row || position.col !== dragEnd?.col)) {
          console.log('Move to position:', position);
          setDragEnd(position);
          updateSelection(dragStart, position);
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        console.log('Mouse up - analyzing selection');
        setIsDragging(false);
        if (dragStart && dragEnd) {
          analyzeSelection(dragStart, dragEnd);
        }
      }
    };

    const handleMouseEnter = (event: MouseEvent) => {
      if (!isDragging || !dragStart) return;
      
      const target = event.target as HTMLElement;
      if ((target.tagName === 'TD' || target.tagName === 'TH') && tableElement.contains(target)) {
        const position = getCellPosition(target);
        if (position && (position.row !== dragEnd?.row || position.col !== dragEnd?.col)) {
          setDragEnd(position);
          updateSelection(dragStart, position);
        }
      }
    };

    updateButtonPositions();
    setIsVisible(true);
    
    // 테이블의 모든 셀에 이벤트 리스너 추가
    const cells = tableElement.querySelectorAll('td, th');
    cells.forEach(cell => {
      cell.addEventListener('mouseenter', handleMouseEnter as EventListener);
    });
    
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    const resizeObserver = new ResizeObserver(updateButtonPositions);
    resizeObserver.observe(tableElement);
    
    window.addEventListener('scroll', updateButtonPositions);
    window.addEventListener('resize', updateButtonPositions);

    return () => {
      cells.forEach(cell => {
        cell.removeEventListener('mouseenter', handleMouseEnter as EventListener);
      });
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateButtonPositions);
      window.removeEventListener('resize', updateButtonPositions);
    };
  }, [tableElement, editor, isDragging, dragStart, dragEnd]);

  const clearSelection = () => {
    selectedCells.forEach(cell => {
      cell.style.backgroundColor = '';
      cell.style.border = '';
    });
    setSelectedCells([]);
    setDeleteType(null);
  };

  const updateSelection = (start: { row: number; col: number }, end: { row: number; col: number }) => {
    clearSelection();
    
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    const rows = tableElement?.querySelectorAll('tr');
    if (!rows) return;
    
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
  };

  const analyzeSelection = (start: { row: number; col: number }, end: { row: number; col: number }) => {
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    const rows = tableElement?.querySelectorAll('tr');
    if (!rows) return;
    
    const totalRows = rows.length;
    const totalCols = rows[0]?.children.length || 0;
    
    console.log('Selection analysis:', { minRow, maxRow, minCol, maxCol, totalRows, totalCols });
    
    // 전체 행이 선택되었는지 확인 (모든 열이 포함)
    const isFullRowSelection = minCol === 0 && maxCol === totalCols - 1;
    // 전체 열이 선택되었는지 확인 (모든 행이 포함)
    const isFullColumnSelection = minRow === 0 && maxRow === totalRows - 1;
    
    const editorContainer = editor.view.dom.closest('.ProseMirror');
    const containerRect = editorContainer?.getBoundingClientRect();
    
    if (!containerRect) return;
    
    if (isFullRowSelection && !isFullColumnSelection) {
      setDeleteType('row');
      // 선택된 행의 중간 위치에 삭제 버튼 배치
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
      // 선택된 열의 중간 위치에 삭제 버튼 배치
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
  };

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

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!tableElement?.contains(target) && !target.closest('.table-button')) {
      clearSelection();
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [tableElement]);

  if (!isVisible) return null;

  return (
    <>
      {/* 열 추가 버튼 (상단 고정) */}
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

      {/* 행 추가 버튼 (왼쪽 고정) */}
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

      {/* 삭제 버튼 (드래그 선택 시) */}
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