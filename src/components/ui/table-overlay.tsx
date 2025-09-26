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

  useEffect(() => {
    if (!tableElement) {
      setIsVisible(false);
      return;
    }

    const updatePositions = () => {
      const rect = tableElement.getBoundingClientRect();
      const editorContainer = editor.view.dom.closest('.ProseMirror');
      const containerRect = editorContainer?.getBoundingClientRect();
      
      if (containerRect) {
        // 첫 번째 셀 찾기
        const firstCell = tableElement.querySelector('td, th');
        if (firstCell) {
          const cellRect = firstCell.getBoundingClientRect();
          
          // 열 메뉴 위치 (첫 번째 셀 위쪽)
          setColumnMenuPosition({
            top: cellRect.top - containerRect.top - 30,
            left: cellRect.left - containerRect.left + (cellRect.width / 2) - 12
          });
          
          // 행 메뉴 위치 (첫 번째 셀 왼쪽)
          setRowMenuPosition({
            top: cellRect.top - containerRect.top + (cellRect.height / 2) - 12,
            left: cellRect.left - containerRect.left - 30
          });
          
          setIsVisible(true);
        }
      }
    };

    updatePositions();
    
    const resizeObserver = new ResizeObserver(updatePositions);
    resizeObserver.observe(tableElement);
    
    window.addEventListener('scroll', updatePositions);
    window.addEventListener('resize', updatePositions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updatePositions);
      window.removeEventListener('resize', updatePositions);
    };
  }, [tableElement, editor]);

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
        className="absolute z-50"
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
        className="absolute z-50"
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