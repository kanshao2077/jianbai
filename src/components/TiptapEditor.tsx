import React, { useEffect, useCallback } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import { TaskList } from '@tiptap/extension-list';
import { Markdown } from 'tiptap-markdown';
import { MarkdownHeadingInput } from '@/lib/markdown-heading-input';
import { MarkdownTableInput } from '@/lib/markdown-table-input';
import { normalizePastedHTML } from '@/lib/markdown-paste';
import { MarkdownTable } from '@/lib/markdown-table';
import { MarkdownTaskInput } from '@/lib/markdown-task-input';
import { MarkdownTaskItem } from '@/lib/markdown-task-item';
import { SelectedTextDrag } from '@/lib/selected-text-drag';

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  onFocus?: () => void;
  onBlur?: () => void;
  editorRef?: React.MutableRefObject<Editor | null>;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({ value, onChange, placeholder, label, onFocus, onBlur, editorRef }) => {
  // 使用 useCallback 稳定回调引用
  const handleUpdate = useCallback(({ editor }: { editor: Editor }) => {
    const html = editor.getHTML();
    onChange(html);
  }, [onChange]);

  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    onBlur?.();
  }, [onBlur]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Write here…',
      }),
      TableKit.configure({ table: false }),
      MarkdownTable.configure({ resizable: false, renderWrapper: true }),
      MarkdownTableInput,
      MarkdownHeadingInput,
      SelectedTextDrag,
      MarkdownTaskInput,
      TaskList,
      MarkdownTaskItem.configure({
        nested: true,
        a11y: { checkboxLabel: node => node.textContent || 'Task' },
      }),
      Markdown.configure({
        html: true, // 允许 HTML
        transformPastedText: true, // 自动转换粘贴的 Markdown 文本
        transformCopiedText: true, // 选区复制也保留 Markdown 结构
      }),
    ],
    content: value,
    editorProps: {
      transformPastedHTML: normalizePastedHTML,
      attributes: {
        class: 'tiptap-editor-content',
        'aria-label': label,
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
    onUpdate: handleUpdate,
    onFocus: handleFocus,
    onBlur: handleBlur,
  });

  // 当外部 value 变化时更新编辑器内容
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  // 将编辑器实例保存到 ref（用于外部访问）
  useEffect(() => {
    if (editorRef && editor) {
      editorRef.current = editor;
    }
    return () => {
      if (editorRef && editorRef.current === editor) editorRef.current = null;
    };
  }, [editor, editorRef]);

  return (
    <div className="w-full h-full">
      <EditorContent editor={editor} className="writer-editor-frame w-full h-full" />
    </div>
  );
};
