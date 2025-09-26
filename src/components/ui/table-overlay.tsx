import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Plus, Minus, Trash2 } from 'lucide-react';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './dropdown-menu';
import { Editor } from '@tiptap/react';

interface TableOverlayProps {
  editor: Editor;
  tableElement: HTMLElement | null;
}

export const TableOverlay: React.FC<TableOverlayProps> = ({ editor, tableElement }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tableElement) {
      setIsVisible(false);
      return;
    }

    const updatePosition = () => {
      const rect = tableElement.getBoundingClientRect();
      const editorContainer = editor.view.dom.closest('.ProseMirror');
      const containerRect = editorContainer?.getBoundingClientRect();
      
      if (containerRect) {
        setPosition({
          top: rect.bottom - containerRect.top - 8,
          left: rect.right - containerRect.left - 8
        });
        setIsVisible(true);
      }
    };

    updatePosition();
    
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(tableElement);
    
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [tableElement, editor]);

  const handleAddRowAbove = () => {
    editor.chain().focus().addRowBefore().run();
  };

  const handleAddRowBelow = () => {
    editor.chain().focus().addRowAfter().run();
  };

  const handleAddColumnLeft = () => {
    editor.chain().focus().addColumnBefore().run();
  };

  const handleAddColumnRight = () => {
    editor.chain().focus().addColumnAfter().run();
  };

  const handleDeleteRow = () => {
    editor.chain().focus().deleteRow().run();
  };

  const handleDeleteColumn = () => {
    editor.chain().focus().deleteColumn().run();
  };

  const handleDeleteTable = () => {
    editor.chain().focus().deleteTable().run();
  };

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      className="absolute z-50"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
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
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleAddRowAbove}>
            <Plus className="h-4 w-4 mr-2" />
            위에 행 추가
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddRowBelow}>
            <Plus className="h-4 w-4 mr-2" />
            아래에 행 추가
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddColumnLeft}>
            <Plus className="h-4 w-4 mr-2" />
            왼쪽에 열 추가
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddColumnRight}>
            <Plus className="h-4 w-4 mr-2" />
            오른쪽에 열 추가
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDeleteRow} className="text-destructive">
            <Minus className="h-4 w-4 mr-2" />
            행 삭제
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDeleteColumn} className="text-destructive">
            <Minus className="h-4 w-4 mr-2" />
            열 삭제
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDeleteTable} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            표 삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};