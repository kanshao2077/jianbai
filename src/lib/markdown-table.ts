import { getHTMLFromFragment } from '@tiptap/core';
import { Table, type TableOptions } from '@tiptap/extension-table';
import type { MarkdownNodeSpec, MarkdownStorage } from 'tiptap-markdown';

type ProseMirrorNode = Parameters<MarkdownNodeSpec<TableOptions>['serialize']>[1];

interface MarkdownTableStorage {
  markdown: MarkdownNodeSpec<TableOptions>;
}

interface MarkdownRuntimeStorage extends MarkdownStorage {
  serializer: {
    serialize(content: ProseMirrorNode | ProseMirrorNode['content']): string;
  };
}

// Pipe tables can represent one paragraph per cell, with a single header row.
// Preserve richer tables as HTML rather than flattening their cell structure.
function isSimpleTable(table: ProseMirrorNode): boolean {
  const columnCount = table.firstChild?.childCount || 0;
  if (!columnCount) return false;

  let simple = true;
  table.forEach((row, _offset, rowIndex) => {
    if (row.childCount !== columnCount) simple = false;
    row.forEach(cell => {
      const paragraph = cell.firstChild;
      if (
        cell.type.name !== (rowIndex === 0 ? 'tableHeader' : 'tableCell') ||
        cell.attrs.colspan > 1 ||
        cell.attrs.rowspan > 1 ||
        cell.childCount !== 1 ||
        paragraph?.type.name !== 'paragraph'
      ) {
        simple = false;
        return;
      }
      paragraph.forEach(child => {
        if (!child.isText) simple = false;
      });
    });
  });
  return simple;
}

export const MarkdownTable = Table.extend<TableOptions, MarkdownTableStorage>({
  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          if (!isSimpleTable(node)) {
            const fragment = node.type.schema.topNodeType.create(null, node).content;
            state.write(getHTMLFromFragment(fragment, node.type.schema));
            state.closeBlock(node);
            return;
          }

          const { serializer } = this.editor.storage.markdown as MarkdownRuntimeStorage;
          node.forEach((row, _offset, rowIndex) => {
            const cells: string[] = [];
            row.forEach(cell => {
              // Serialize each cell independently to retain marks and links.
              // markdown-it removes one backslash before every escaped pipe
              // before parsing inline content, including inline code spans.
              const markdown = serializer.serialize(cell.content).replace(/\|/g, '\\|');
              cells.push(markdown);
            });
            state.write(`| ${cells.join(' | ')} |`);
            state.ensureNewLine();
            if (rowIndex === 0) {
              state.write(`| ${cells.map(() => '---').join(' | ')} |`);
              state.ensureNewLine();
            }
          });
          state.closeBlock(node);
        },
        parse: {}, // markdown-it already parses ordinary pipe tables.
      },
    };
  },
});
