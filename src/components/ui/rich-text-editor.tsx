import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Button } from '@/components/ui/button';
import { TableSizeSelector } from '@/components/ui/table-size-selector';
import { TableOverlay } from '@/components/ui/table-overlay';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  onEditorReady?: (editor: any) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder,
  className,
  onEditorReady
}) => {
  const [currentTable, setCurrentTable] = React.useState<HTMLElement | null>(null);
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      // Check if we're in a table
      if (editor.isActive('table')) {
        try {
          const selection = editor.state.selection;
          const resolvedPos = editor.view.domAtPos(selection.anchor);
          let element = resolvedPos.node as Node;
          
          // Walk up the DOM tree to find the table element
          while (element && element.nodeType !== Node.ELEMENT_NODE) {
            element = element.parentNode!;
          }
          
          const tableElement = (element as Element)?.closest('table') as HTMLElement;
          setCurrentTable(tableElement || null);
        } catch (error) {
          setCurrentTable(null);
        }
      } else {
        setCurrentTable(null);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[100px] p-3 focus:outline-none [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted [&_table]:relative [&_.selectedCell]:bg-blue-100 [&_.column-resize-handle]:bg-blue-500',
        style: 'white-space: pre-wrap;'
      },
      handleKeyDown: (view, event) => {
        // Handle Delete key and Backspace key for selected table cells/rows/columns
        if ((event.key === 'Delete' || event.key === 'Backspace') && editor.isActive('table')) {
          const { state } = editor;
          const { selection } = state;
          
          // Check if we have multiple cells selected (CellSelection)
          if (selection.constructor.name === 'CellSelection') {
            // Clear content of selected cells
            const cellSelection = selection as any;
            let tr = state.tr;
            
            cellSelection.forEachCell((cell: any, cellPos: number) => {
              const cellStart = cellPos + 1;
              const cellEnd = cellPos + cell.content.size + 1;
              tr = tr.delete(cellStart, cellEnd);
            });
            
            if (tr.docChanged) {
              view.dispatch(tr);
              return true;
            }
          } else {
            // Single cell - just delete selection
            editor.chain().focus().deleteSelection().run();
            return true;
          }
        }
        
        return false;
      },
      handleDOMEvents: {
        mousedown: (view, event) => {
          // Add selection styling for table cells
          const target = event.target as HTMLElement;
          if (target.tagName === 'TD' || target.tagName === 'TH') {
            // Enable cell selection highlighting
            const table = target.closest('table');
            if (table) {
              // Remove previous selections
              table.querySelectorAll('.selectedCell').forEach(cell => {
                cell.classList.remove('selectedCell');
              });
            }
          }
          return false;
        },
        
        mouseup: (view, event) => {
          // Handle cell selection completion
          setTimeout(() => {
            const { state } = view;
            const { selection } = state;
            
            if (selection.constructor.name === 'CellSelection') {
              const cellSelection = selection as any;
              cellSelection.forEachCell((cell: any, cellPos: number) => {
                const domNode = view.domAtPos(cellPos + 1).node;
                const cellElement = domNode.nodeType === Node.ELEMENT_NODE 
                  ? domNode as HTMLElement 
                  : domNode.parentElement;
                  
                if (cellElement && (cellElement.tagName === 'TD' || cellElement.tagName === 'TH')) {
                  cellElement.classList.add('selectedCell');
                }
              });
            }
          }, 0);
          return false;
        }
      }
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("border border-input rounded-md", className)}>
      {/* Toolbar */}
      <div className="border-b border-input p-2 flex flex-wrap gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-muted' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-muted' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-muted' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-muted' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        {/* Table buttons */}
        <TableSizeSelector 
          onTableCreate={(rows, cols) => 
            editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
          } 
        />
      </div>
      
      {/* Editor */}
      <div className="relative">
        <EditorContent 
          editor={editor} 
          className="min-h-[100px]"
          placeholder={placeholder}
        />
        <TableOverlay editor={editor} tableElement={currentTable} />
      </div>
    </div>
  );
};