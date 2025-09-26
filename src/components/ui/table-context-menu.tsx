import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Plus, Minus, Trash2 } from 'lucide-react';

interface TableContextMenuProps {
  children: React.ReactNode;
  editor: any;
  onAddRow: () => void;
  onAddColumn: () => void;
  onDeleteRow: () => void;
  onDeleteColumn: () => void;
  onDeleteTable: () => void;
}

export const TableContextMenu: React.FC<TableContextMenuProps> = ({
  children,
  editor,
  onAddRow,
  onAddColumn,
  onDeleteRow,
  onDeleteColumn,
  onDeleteTable,
}) => {
  const isInTable = editor?.isActive('table');

  if (!isInTable) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onAddRow} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          행 추가
        </ContextMenuItem>
        <ContextMenuItem onClick={onAddColumn} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          열 추가
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDeleteRow} className="flex items-center gap-2 text-destructive">
          <Minus className="h-4 w-4" />
          행 삭제
        </ContextMenuItem>
        <ContextMenuItem onClick={onDeleteColumn} className="flex items-center gap-2 text-destructive">
          <Minus className="h-4 w-4" />
          열 삭제
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDeleteTable} className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-4 w-4" />
          표 삭제
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};