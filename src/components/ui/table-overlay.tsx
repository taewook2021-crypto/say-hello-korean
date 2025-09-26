import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
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

    updateButtonPositions();
    setIsVisible(true);
    
    const resizeObserver = new ResizeObserver(updateButtonPositions);
    resizeObserver.observe(tableElement);
    
    window.addEventListener('scroll', updateButtonPositions);
    window.addEventListener('resize', updateButtonPositions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateButtonPositions);
      window.removeEventListener('resize', updateButtonPositions);
    };
  }, [tableElement, editor]);

  const handleAddColumn = () => {
    editor.chain().focus().addColumnAfter().run();
  };

  const handleAddRow = () => {
    editor.chain().focus().addRowAfter().run();
  };

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
          className="h-6 w-6 p-0 bg-background border border-border shadow-sm hover:bg-accent"
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
          className="h-6 w-6 p-0 bg-background border border-border shadow-sm hover:bg-accent"
          onClick={handleAddRow}
          title="행 추가"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </>
  );
};