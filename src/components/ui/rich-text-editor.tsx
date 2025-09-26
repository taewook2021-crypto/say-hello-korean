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
        class: 'prose prose-sm max-w-none min-h-[100px] p-3 focus:outline-none [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted [&_table]:relative [&_.column-resize-handle]:bg-blue-500',
        style: 'white-space: pre-wrap;'
      },
      handleKeyDown: (view, event) => {
        // Handle backspace and delete keys for table operations
        if (event.key === 'Backspace' || event.key === 'Delete') {
          const { state } = view;
          const { selection } = state;
          
          // Check if we're in a table
          if (editor?.isActive('table')) {
            // If there's a selection range (dragged selection)
            if (!selection.empty) {
              const { from, to } = selection;
              const selectedContent = state.doc.textBetween(from, to, ' ');
              
              // Check if entire table is selected
              const tableNode = editor.state.selection.$from.node(-1);
              if (tableNode && tableNode.type.name === 'table') {
                // If most/all of table content is selected, delete entire table
                const tableSize = tableNode.content.size;
                const selectionSize = to - from;
                
                if (selectionSize >= tableSize * 0.8) { // 80% threshold
                  event.preventDefault();
                  editor.chain().focus().deleteTable().run();
                  return true;
                }
              }
              
              // Check for row/column selection patterns
              const tr = state.tr;
              const resolvedFrom = tr.doc.resolve(from);
              const resolvedTo = tr.doc.resolve(to);
              
              // If selection spans multiple cells in same row, delete row
              if (resolvedFrom.parent.type.name === 'tableRow' && 
                  resolvedTo.parent.type.name === 'tableRow' &&
                  resolvedFrom.parent === resolvedTo.parent) {
                event.preventDefault();
                editor.chain().focus().deleteRow().run();
                return true;
              }
              
              // If selection spans multiple rows in same column position, delete column
              const fromCellIndex = resolvedFrom.index(-1);
              const toCellIndex = resolvedTo.index(-1);
              if (fromCellIndex === toCellIndex && 
                  resolvedFrom.depth > 2 && resolvedTo.depth > 2) {
                event.preventDefault();
                editor.chain().focus().deleteColumn().run();
                return true;
              }
              
              // For regular cell content selection, clear the content
              event.preventDefault();
              editor.chain().focus().deleteSelection().run();
              return true;
            }
          }
        }
        
        return false;
      }
    },
  });

  // Update editor content when prop changes
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("border border-input rounded-md", className)}>
      {/* Toolbar */}
      <div className="border-b border-input p-2 flex flex-wrap gap-1">
        
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