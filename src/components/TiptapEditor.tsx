import React, { useEffect, useCallback } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  editorRef?: React.MutableRefObject<Editor | null>;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({ value, onChange, placeholder, onFocus, onBlur, editorRef }) => {
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
        placeholder: placeholder || '开始输入...',
      }),
      Markdown.configure({
        html: true, // 允许 HTML
        transformPastedText: true, // 自动转换粘贴的 Markdown 文本
        transformCopiedText: false, // 复制时不转换为 Markdown
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content',
      },
    },
    onUpdate: handleUpdate,
    onFocus: handleFocus,
    onBlur: handleBlur,
  });

  // 当外部 value 变化时更新编辑器内容
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // 将编辑器实例保存到 ref（用于外部访问）
  useEffect(() => {
    if (editorRef && editor) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  // 🔧 修复：组件卸载时销毁编辑器实例，防止内存泄漏
  useEffect(() => {
    return () => {
      if (editor && !editor.isDestroyed) {
        editor.destroy();
      }
    };
  }, [editor]);

  return (
    <div className="w-full h-full">
      <EditorContent editor={editor} className="w-full h-full px-6 pt-2" />
    </div>
  );
};
