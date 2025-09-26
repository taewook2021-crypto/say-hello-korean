import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Button } from '@/components/ui/button';
import { TableSizeSelector } from '@/components/ui/table-size-selector';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Minus,
  Plus,
  Trash2
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
    },
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[100px] p-3 focus:outline-none [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted',
        style: 'white-space: pre-wrap;'
      },
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
        
         {editor.isActive('table') && (
           <>
             <div className="flex items-center gap-1 ml-2">
               <span className="text-xs text-muted-foreground mr-2">표 편집:</span>
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 onClick={() => editor.chain().focus().addRowBefore().run()}
                 className="text-xs px-2"
               >
                 행 추가(위)
               </Button>
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 onClick={() => editor.chain().focus().addRowAfter().run()}
                 className="text-xs px-2"
               >
                 행 추가(아래)
               </Button>
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 onClick={() => editor.chain().focus().addColumnBefore().run()}
                 className="text-xs px-2"
               >
                 열 추가(왼쪽)
               </Button>
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 onClick={() => editor.chain().focus().addColumnAfter().run()}
                 className="text-xs px-2"
               >
                 열 추가(오른쪽)
               </Button>
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 onClick={() => editor.chain().focus().deleteRow().run()}
                 className="text-xs px-2 text-destructive"
               >
                 행 삭제
               </Button>
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 onClick={() => editor.chain().focus().deleteColumn().run()}
                 className="text-xs px-2 text-destructive"
               >
                 열 삭제
               </Button>
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 onClick={() => editor.chain().focus().deleteTable().run()}
                 className="text-xs px-2 text-destructive"
               >
                 표 삭제
               </Button>
             </div>
           </>
         )}
      </div>
      
      {/* Editor */}
      <EditorContent 
        editor={editor} 
        className="min-h-[100px]"
        placeholder={placeholder}
      />
      
      {/* Floating Table Controls */}
      {editor?.isActive('table') && (
        <div className="mt-2 p-2 bg-muted rounded-md border">
          <p className="text-xs text-muted-foreground mb-2">표가 선택되었습니다. 아래 버튼으로 편집하세요:</p>
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              className="text-xs"
            >
              위에 행 추가
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="text-xs"
            >
              아래에 행 추가
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              className="text-xs"
            >
              왼쪽에 열 추가
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="text-xs"
            >
              오른쪽에 열 추가
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="text-xs text-destructive"
            >
              행 삭제
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="text-xs text-destructive"
            >
              열 삭제
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="text-xs text-destructive"
            >
              표 전체 삭제
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};