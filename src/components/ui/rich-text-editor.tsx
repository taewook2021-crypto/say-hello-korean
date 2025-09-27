import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableSizeSelector } from '@/components/ui/table-size-selector';
import { Button } from '@/components/ui/button';
import { Copy, Plus, Minus, Trash2, Rows, Columns, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
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
  const [isInTable, setIsInTable] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      setIsInTable(editor.can().addRowBefore());
    },
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
      setIsInTable(editor.can().addRowBefore());
    },
    onSelectionUpdate: ({ editor }) => {
      setIsInTable(editor.can().addRowBefore());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[100px] p-3 focus:outline-none [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted',
        style: 'white-space: pre-wrap;'
      },
    },
  });

  // Update editor content when prop changes
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const copyTable = () => {
    // 커스텀 표 복사 함수가 있는 경우 실행
    if ((editor as any).copyTableFromQuestion) {
      (editor as any).copyTableFromQuestion();
      return;
    }
    
    // 기본 표 복사 기능 (클립보드로 복사)
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    // Find the table node that contains the current selection
    let tableNode = null;
    let tablePos = null;
    
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'table') {
        if (pos <= $from.pos && pos + node.nodeSize >= $from.pos) {
          tableNode = node;
          tablePos = pos;
          return false; // Stop searching
        }
      }
      return true;
    });
    
    if (tableNode) {
      // Convert table node to HTML
      const tempDiv = document.createElement('div');
      const tableHTML = editor.schema.nodeFromJSON(tableNode.toJSON());
      const fragment = editor.schema.topNodeType.createAndFill()?.content;
      if (fragment) {
        const serializer = editor.schema.topNodeType.spec.toDOM;
        if (serializer) {
          // Get the table HTML
          const tableElement = document.querySelector('.ProseMirror table');
          if (tableElement) {
            const clonedTable = tableElement.cloneNode(true) as HTMLElement;
            // Copy to clipboard
            navigator.clipboard.writeText(clonedTable.outerHTML).then(() => {
              toast.success('표가 클립보드에 복사되었습니다');
            }).catch(() => {
              toast.error('표 복사에 실패했습니다');
            });
          }
        }
      }
    } else {
      toast.error('복사할 표를 찾을 수 없습니다');
    }
  };

  if (!editor) {
    return null;
  }

  

  return (
    <div className={cn("border border-input rounded-md", className)}>
      {/* Toolbar */}
      <div className="border-b border-input p-2 flex flex-wrap gap-1">
        
        {/* Table creation */}
        <TableSizeSelector 
          onTableCreate={(rows, cols) => 
            editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
          } 
        />
        
        {/* Table copy */}
        <Button
          size="sm"
          variant="outline"
          onClick={copyTable}
          className="h-8 px-2"
          disabled={!isInTable}
        >
          <Copy className="h-4 w-4" />
        </Button>

        {/* Row management */}
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().addRowBefore().run()}
          className="h-8 px-2 bg-blue-50 hover:bg-blue-100 border-blue-200"
          title="위에 행 추가"
          disabled={!isInTable}
        >
          <div className="flex flex-col items-center">
            <ArrowUp className="h-2 w-2 text-blue-600" />
            <Plus className="h-3 w-3" />
          </div>
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          className="h-8 px-2 bg-green-50 hover:bg-green-100 border-green-200"
          title="아래에 행 추가"
          disabled={!isInTable}
        >
          <div className="flex flex-col items-center">
            <Plus className="h-3 w-3" />
            <ArrowDown className="h-2 w-2 text-green-600" />
          </div>
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().deleteRow().run()}
          className="h-8 px-2"
          title="행 삭제"
          disabled={!isInTable}
        >
          <Rows className="h-4 w-4" />
          <Minus className="h-3 w-3" />
        </Button>

        {/* Column management */}
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          className="h-8 px-2 bg-purple-50 hover:bg-purple-100 border-purple-200"
          title="왼쪽에 열 추가"
          disabled={!isInTable}
        >
          <div className="flex items-center">
            <ArrowLeft className="h-2 w-2 text-purple-600" />
            <Plus className="h-3 w-3" />
          </div>
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          className="h-8 px-2 bg-orange-50 hover:bg-orange-100 border-orange-200"
          title="오른쪽에 열 추가"
          disabled={!isInTable}
        >
          <div className="flex items-center">
            <Plus className="h-3 w-3" />
            <ArrowRight className="h-2 w-2 text-orange-600" />
          </div>
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().deleteColumn().run()}
          className="h-8 px-2"
          title="열 삭제"
          disabled={!isInTable}
        >
          <Columns className="h-4 w-4" />
          <Minus className="h-3 w-3" />
        </Button>

        {/* Table deletion */}
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().deleteTable().run()}
          className="h-8 px-2"
          title="표 삭제"
          disabled={!isInTable}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Editor */}
      <EditorContent 
        editor={editor} 
        className="min-h-[100px]"
        placeholder={placeholder}
      />
    </div>
  );
};