import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Plus, Minus } from 'lucide-react';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './dropdown-menu';
import { Editor } from '@tiptap/react';

interface TableOverlayProps {
  editor: Editor;
  tableElement: HTMLElement | null;
}

export const TableOverlay: React.FC<TableOverlayProps> = ({ editor, tableElement }) => {
  const [columnMenuPosition, setColumnMenuPosition] = useState({ top: 0, left: 0 });
  const [rowMenuPosition, setRowMenuPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [clickedCell, setClickedCell] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!tableElement) {
      setIsVisible(false);
      setClickedCell(null);
      return;
    }

    const handleCellClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't hide menus if clicking on dropdown menu elements
      if (target.closest('[data-radix-popper-content-wrapper]') || 
          target.closest('.table-overlay-menu') ||
          target.closest('[role="menuitem"]')) {
        return;
      }
      
      if ((target.tagName === 'TD' || target.tagName === 'TH') && 
          tableElement.contains(target)) {
        setClickedCell(target);
        updateMenuPositions(target);
        setIsVisible(true);
      } else {
        // Hide menus when clicking outside table or menus
        setIsVisible(false);
        setClickedCell(null);
      }
    };

    const updateMenuPositions = (cell: HTMLElement) => {
      const editorContainer = editor.view.dom.closest('.ProseMirror');
      const containerRect = editorContainer?.getBoundingClientRect();
      
      if (containerRect && cell) {
        // 클릭된 셀의 행과 열 인덱스 찾기
        const row = cell.closest('tr');
        const table = cell.closest('table');
        
        if (row && table) {
          const cellIndex = Array.from(row.children).indexOf(cell);
          const rowIndex = Array.from(table.querySelectorAll('tr')).indexOf(row);
          
          // 해당 열의 첫 번째 셀 (첫 번째 행)
          const firstRowCells = table.querySelector('tr')?.children;
          const firstCellInColumn = firstRowCells?.[cellIndex] as HTMLElement;
          
          // 해당 행의 첫 번째 셀 (첫 번째 열)
          const firstCellInRow = row.children[0] as HTMLElement;
          
          if (firstCellInColumn) {
            const firstCellColumnRect = firstCellInColumn.getBoundingClientRect();
            // 열 메뉴 위치 (해당 열의 첫 번째 셀 위쪽)
            setColumnMenuPosition({
              top: firstCellColumnRect.top - containerRect.top - 30,
              left: firstCellColumnRect.left - containerRect.left + (firstCellColumnRect.width / 2) - 12
            });
          }
          
          if (firstCellInRow) {
            const firstCellRowRect = firstCellInRow.getBoundingClientRect();
            // 행 메뉴 위치 (해당 행의 첫 번째 셀 왼쪽)
            setRowMenuPosition({
              top: firstCellRowRect.top - containerRect.top + (firstCellRowRect.height / 2) - 12,
              left: firstCellRowRect.left - containerRect.left - 30
            });
          }
        }
      }
    };

    // Add click event listener to document
    document.addEventListener('click', handleCellClick);
    
    const resizeObserver = new ResizeObserver(() => {
      if (clickedCell) {
        updateMenuPositions(clickedCell);
      }
    });
    resizeObserver.observe(tableElement);
    
    window.addEventListener('scroll', () => {
      if (clickedCell) {
        updateMenuPositions(clickedCell);
      }
    });
    window.addEventListener('resize', () => {
      if (clickedCell) {
        updateMenuPositions(clickedCell);
      }
    });

    return () => {
      document.removeEventListener('click', handleCellClick);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', () => {});
      window.removeEventListener('resize', () => {});
    };
  }, [tableElement, editor, clickedCell]);

  const handleAddColumnBefore = () => {
    editor.chain().focus().addColumnBefore().run();
  };

  const handleAddColumnAfter = () => {
    editor.chain().focus().addColumnAfter().run();
  };

  const handleDeleteColumn = () => {
    editor.chain().focus().deleteColumn().run();
  };

  const handleAddRowBefore = () => {
    editor.chain().focus().addRowBefore().run();
  };

  const handleAddRowAfter = () => {
    editor.chain().focus().addRowAfter().run();
  };

  const handleDeleteRow = () => {
    editor.chain().focus().deleteRow().run();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* 열 편집 메뉴 (위쪽) */}
      <div
        className="absolute z-50 table-overlay-menu"
        style={{
          top: `${columnMenuPosition.top}px`,
          left: `${columnMenuPosition.left}px`
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 bg-background border border-border shadow-sm hover:bg-accent table-overlay-menu"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-40 table-overlay-menu">
            <DropdownMenuItem onClick={handleAddColumnAfter} className="table-overlay-menu">
              <Plus className="h-4 w-4 mr-2" />
              오른쪽에 열 추가
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDeleteColumn} className="text-destructive table-overlay-menu">
              <Minus className="h-4 w-4 mr-2" />
              열 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 행 편집 메뉴 (왼쪽) */}
      <div
        className="absolute z-50 table-overlay-menu"
        style={{
          top: `${rowMenuPosition.top}px`,
          left: `${rowMenuPosition.left}px`
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 bg-background border border-border shadow-sm hover:bg-accent table-overlay-menu"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-40 table-overlay-menu">
            <DropdownMenuItem onClick={handleAddRowAfter} className="table-overlay-menu">
              <Plus className="h-4 w-4 mr-2" />
              아래에 행 추가
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDeleteRow} className="text-destructive table-overlay-menu">
              <Minus className="h-4 w-4 mr-2" />
              행 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};