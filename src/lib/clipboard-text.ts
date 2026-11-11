import { Extension, type Editor } from '@tiptap/core';
import type { Fragment } from '@tiptap/pm/model';
import { Plugin } from '@tiptap/pm/state';
import type { MarkdownStorage } from 'tiptap-markdown';

interface MarkdownRuntimeStorage extends MarkdownStorage {
  serializer: { serialize(content: Fragment): string };
}

function serializeClipboardText(content: Fragment, editor: Editor): string {
  // A code-only selection should paste as code, including into another code block.
  if (content.childCount === 1 && content.firstChild?.type.spec.code) {
    return content.firstChild.textContent;
  }

  let plain = true;
  content.forEach(block => {
    if (block.type.name !== 'paragraph') plain = false;
    block.forEach(node => {
      if (node.type.name !== 'hardBreak' && (!node.isText || node.marks.length > 0)) {
        plain = false;
      }
    });
  });
  if (plain) {
    return content.textBetween(0, content.size, '\n\n', node =>
      node.type.name === 'hardBreak' ? '\n' : '',
    );
  }

  // Preserve Markdown export for structured selections and mixed documents.
  return (editor.storage.markdown as MarkdownRuntimeStorage).serializer.serialize(content);
}

export const ClipboardText = Extension.create({
  name: 'versoClipboardText',
  priority: 1100,
  addProseMirrorPlugins() {
    return [new Plugin({
      props: {
        clipboardTextSerializer: slice => serializeClipboardText(slice.content, this.editor),
      },
    })];
  },
});
