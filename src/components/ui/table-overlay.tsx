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
      if ((target.tagName === 'TD' || target.tagName === 'TH') && 
          tableElement.contains(target)) {
        setClickedCell(target);
        updateMenuPositions(target);
        setIsVisible(true);
      } else if (!target.closest('.table-overlay-menu')) {
        // Hide menus when clicking outside table or menus
        setIsVisible(false);
        setClickedCell(null);
      }
    };

    const updateMenuPositions = (cell: HTMLElement) => {
      const editorContainer = editor.view.dom.closest('.ProseMirror');
      const containerRect = editorContainer?.getBoundingClientRect();
      
      if (containerRect && cell && tableElement) {
        const table = tableElement.querySelector('table');
        if (!table) return;

        // 클릭된 셀의 행과 열 인덱스 찾기
        const rows = Array.from(table.querySelectorAll('tr'));
        let rowIndex = -1;
        let colIndex = -1;

        for (let i = 0; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll('td, th'));
          const cellIndexInRow = cells.indexOf(cell);
          if (cellIndexInRow !== -1) {
            rowIndex = i;
            colIndex = cellIndexInRow;
            break;
          }
        }

        if (rowIndex === -1 || colIndex === -1) return;

        // 해당 열의 첫 번째 셀 (첫 번째 행의 해당 열)
        const firstRowCells = Array.from(rows[0].querySelectorAll('td, th'));
        const columnFirstCell = firstRowCells[colIndex];
        
        // 해당 행의 첫 번째 셀 (해당 행의 첫 번째 열)
        const rowCells = Array.from(rows[rowIndex].querySelectorAll('td, th'));
        const rowFirstCell = rowCells[0];

        if (columnFirstCell && rowFirstCell) {
          const columnRect = columnFirstCell.getBoundingClientRect();
          const rowRect = rowFirstCell.getBoundingClientRect();
          
          // 열 메뉴 위치 (해당 열의 제일 위쪽)
          setColumnMenuPosition({
            top: columnRect.top - containerRect.top - 30,
            left: columnRect.left - containerRect.left + (columnRect.width / 2) - 12
          });
          
          // 행 메뉴 위치 (해당 행의 제일 왼쪽)
          setRowMenuPosition({
            top: rowRect.top - containerRect.top + (rowRect.height / 2) - 12,
            left: rowRect.left - containerRect.left - 30
          });
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
              className="h-6 w-6 p-0 bg-background border border-border shadow-sm hover:bg-accent"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-40">
            <DropdownMenuItem onClick={handleAddColumnBefore}>
              <Plus className="h-4 w-4 mr-2" />
              왼쪽에 열 추가
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddColumnAfter}>
              <Plus className="h-4 w-4 mr-2" />
              오른쪽에 열 추가
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDeleteColumn} className="text-destructive">
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
              className="h-6 w-6 p-0 bg-background border border-border shadow-sm hover:bg-accent"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-40">
            <DropdownMenuItem onClick={handleAddRowBefore}>
              <Plus className="h-4 w-4 mr-2" />
              위에 행 추가
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddRowAfter}>
              <Plus className="h-4 w-4 mr-2" />
              아래에 행 추가
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDeleteRow} className="text-destructive">
              <Minus className="h-4 w-4 mr-2" />
              행 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};