import { Extension } from '@tiptap/core';

const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(cell => cell.trim());

/** Turn a typed header + delimiter into a table when Enter is pressed. */
export const MarkdownTableInput = Extension.create({
  name: 'markdownTableInput',
  priority: 1100,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { selection, doc } = this.editor.state;
        const { $from } = selection;
        if (!selection.empty || $from.depth !== 1 || $from.parent.type.name !== 'paragraph'
          || $from.parentOffset !== $from.parent.content.size || $from.index(0) === 0) return false;

        const delimiter = $from.parent.textContent;
        const separators = cells(delimiter);
        if (!delimiter.includes('|') || !separators.every(cell => /^:?-{3,}:?$/.test(cell))) return false;

        const header = doc.child($from.index(0) - 1);
        if (header.type.name !== 'paragraph' || !header.textContent.includes('|')
          || cells(header.textContent).length !== separators.length) return false;

        const from = $from.before() - header.nodeSize;
        const tableContent = {
          type: 'table',
          content: [
            { type: 'tableRow', content: cells(header.textContent).map(text => ({
              type: 'tableHeader',
              content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
            })) },
            { type: 'tableRow', content: separators.map(() => ({
              type: 'tableCell', content: [{ type: 'paragraph' }],
            })) },
          ],
        };
        this.editor.commands.insertContentAt({ from, to: $from.after() }, tableContent);
        const table = this.editor.state.doc.nodeAt(from);
        if (table?.type.name === 'table' && table.firstChild) {
          this.editor.commands.setTextSelection(from + table.firstChild.nodeSize + 4);
        }
        return true;
      },
    };
  },
});
