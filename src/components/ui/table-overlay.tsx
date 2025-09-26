import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface TableOverlayProps {
  editor: any;
  tableElement: HTMLElement | null;
}

export const TableOverlay: React.FC<TableOverlayProps> = ({ editor, tableElement }) => {
  const [columnButtonPosition, setColumnButtonPosition] = React.useState({ top: 0, left: 0 });
  const [rowButtonPosition, setRowButtonPosition] = React.useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = React.useState(false);

  const updateButtonPositions = React.useCallback(() => {
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

  // Set up observers
  React.useEffect(() => {
    if (!tableElement) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    updateButtonPositions();

    // Create ResizeObserver to track table size changes
    const resizeObserver = new ResizeObserver(() => {
      updateButtonPositions();
    });
    resizeObserver.observe(tableElement);

    // Track scroll and resize
    const handleScrollOrResize = () => updateButtonPositions();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      resizeObserver.disconnect();
    };
  }, [tableElement, updateButtonPositions]);

  const handleAddColumn = () => {
    editor?.chain().focus().addColumnAfter().run();
  };

  const handleAddRow = () => {
    editor?.chain().focus().addRowAfter().run();
  };

  if (!isVisible || !tableElement) return null;

  return (
    <div className="relative">
      {/* 열 추가 버튼 */}
      <div
        className="absolute z-50"
        style={{
          top: `${columnButtonPosition.top}px`,
          left: `${columnButtonPosition.left}px`
        }}
      >
        <Button
          size="sm"
          variant="outline"
          className="h-6 w-6 p-0 bg-background border-border hover:bg-accent"
          onClick={handleAddColumn}
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
          size="sm"
          variant="outline"
          className="h-6 w-6 p-0 bg-background border-border hover:bg-accent"
          onClick={handleAddRow}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};