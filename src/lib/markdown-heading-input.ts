import { Extension } from '@tiptap/core';
import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { isHistoryTransaction } from '@tiptap/pm/history';
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

type InputStart = { state: EditorState; from: number };
type SoftLine = { from: number; to: number; index: number };

const headingPrefix = /^( {0,3})(#{1,6})[\t ]+/;

function lineAt(node: ProseMirrorNode, offset: number): SoftLine {
  let from = 0;
  let index = 0;
  let line: SoftLine | null = null;
  node.forEach((child, position) => {
    if (line || child.type.name !== 'hardBreak') return;
    if (offset <= position) line = { from, to: position, index };
    else { from = position + child.nodeSize; index++; }
  });
  return line || { from, to: node.content.size, index };
}

/** Format only the soft line that received new input, retaining all surrounding content. */
function headingTransaction(state: EditorState, start: InputStart): Transaction | null {
  const { selection, schema } = state;
  const { $from } = selection;
  if (!selection.empty || !$from.depth || $from.parent.type.name !== 'paragraph') return null;
  const $before = start.state.doc.resolve(start.from);
  if (!$before.depth || $before.parent.type.name !== 'paragraph'
    || $before.before() !== $from.before()) return null;

  const paragraph = $from.parent;
  const line = lineAt(paragraph, $from.parentOffset);
  const oldLine = lineAt($before.parent, $before.parentOffset);
  if (oldLine.index !== line.index) return null;
  const text = paragraph.textBetween(line.from, line.to, '', '\ufffc');
  const match = headingPrefix.exec(text);
  if (!match) return null;

  const oldText = $before.parent.textBetween(oldLine.from, oldLine.to, '', '\ufffc');
  const oldMatch = headingPrefix.exec(oldText);
  // Editing the words of an intentionally literal/saved heading must not activate a shortcut.
  if (oldMatch && oldMatch[0] === match[0]
    && $before.parentOffset >= oldLine.from + oldMatch[0].length) return null;

  const markerFrom = line.from + match[1].length;
  const markerTo = markerFrom + match[2].length;
  let codeMarker = false;
  paragraph.nodesBetween(markerFrom, markerTo, node => {
    if (node.marks.some(mark => mark.type.spec.code)) codeMarker = true;
  });
  const headingType = schema.nodes.heading;
  if (codeMarker || !headingType) return null;

  const nodes: ProseMirrorNode[] = [];
  if (line.from > 0) nodes.push(paragraph.type.create(paragraph.attrs,
    paragraph.content.cut(0, line.from - 1)));
  const beforeSize = nodes.reduce((size, node) => size + node.nodeSize, 0);
  const content = paragraph.content.cut(line.from + match[0].length, line.to);
  nodes.push(headingType.create({ level: match[2].length }, content));
  if (line.to < paragraph.content.size) nodes.push(paragraph.type.create(paragraph.attrs,
    paragraph.content.cut(line.to + 1)));

  const replacement = Fragment.fromArray(nodes);
  const parent = $from.node(-1);
  const index = $from.index(-1);
  if (!parent.canReplace(index, index + 1, replacement)) return null;
  const position = $from.before();
  const caret = position + beforeSize + 1
    + Math.max(0, Math.min(content.size, $from.parentOffset - line.from - match[0].length));
  const tr = state.tr.replaceWith(position, $from.after(), replacement);
  tr.setSelection(TextSelection.create(tr.doc, caret));
  if (state.storedMarks) tr.setStoredMarks(state.storedMarks);
  return tr.scrollIntoView();
}

function excludedInput(transaction: Transaction): boolean {
  const event = transaction.getMeta('uiEvent');
  return event === 'paste' || event === 'drop' || isHistoryTransaction(transaction)
    || Boolean(transaction.getMeta('preventUpdate')) || transaction.getMeta('addToHistory') === false;
}

/** Recover heading shortcuts for atomic/IME input and a line following Shift+Enter. */
export const MarkdownHeadingInput = Extension.create({
  name: 'markdownHeadingInput',
  priority: 1100,
  addProseMirrorPlugins() {
    const key = new PluginKey('markdownHeadingInput');
    let view: EditorView | null = null;
    let pending: InputStart | null = null;
    let composition: InputStart | null = null;
    let endingComposition: InputStart | null = null;
    let compositionId: number | undefined;
    let inputTimer: ReturnType<typeof setTimeout> | undefined;
    let compositionTimer: ReturnType<typeof setTimeout> | undefined;

    const clearInput = () => { clearTimeout(inputTimer); pending = null; };
    const clearComposition = () => {
      clearTimeout(compositionTimer);
      composition = null;
      endingComposition = null;
      compositionId = undefined;
    };
    const capture = (currentView: EditorView, from: number) => {
      if (currentView.composing || composition) return;
      clearInput();
      pending = { state: currentView.state, from };
      inputTimer = setTimeout(clearInput, 50);
    };
    const finishComposition = (start: InputStart, attempt = 0) => {
      if (!view || view.isDestroyed || endingComposition !== start || !view.hasFocus()) {
        clearComposition();
        return;
      }
      if (view.composing || view.state.doc.eq(start.state.doc)) {
        if (attempt < 2) compositionTimer = setTimeout(() => finishComposition(start, attempt + 1), 20);
        else clearComposition();
        return;
      }
      const tr = headingTransaction(view.state, start);
      const id = compositionId;
      clearComposition();
      if (tr) {
        tr.setMeta(key, true);
        if (id !== undefined) tr.setMeta('composition', id);
        view.dispatch(tr);
      }
    };

    return [new Plugin({
      key,
      props: {
        handleTextInput(currentView, from) {
          capture(currentView, from);
          return false;
        },
        handleDOMEvents: {
          beforeinput(currentView, event) {
            const input = event as InputEvent;
            if (!input.isComposing && (input.inputType === 'insertText'
              || input.inputType === 'insertReplacementText')) {
              capture(currentView, currentView.state.selection.from);
            }
            return false;
          },
          compositionstart(currentView) {
            clearInput();
            clearComposition();
            composition = { state: currentView.state, from: currentView.state.selection.from };
            return false;
          },
          compositionend() {
            const start = composition;
            composition = null;
            if (start) {
              endingComposition = start;
              compositionTimer = setTimeout(() => finishComposition(start), 0);
            }
            return false;
          },
          blur() { clearInput(); clearComposition(); return false; },
        },
      },
      appendTransaction(transactions, _oldState, newState) {
        if (transactions.some(excludedInput)) {
          clearInput();
          clearComposition();
          return null;
        }
        if (composition || endingComposition) {
          for (const transaction of transactions) {
            const id = transaction.getMeta('composition');
            if (typeof id === 'number') compositionId = id;
          }
        }
        if (!pending || !transactions.some(transaction => transaction.docChanged)) return null;
        const start = pending;
        clearInput();
        if (composition || view?.composing || transactions.some(transaction => transaction.getMeta(key))) return null;
        return headingTransaction(newState, start)?.setMeta(key, true) || null;
      },
      view(currentView) {
        view = currentView;
        return { destroy() { clearInput(); clearComposition(); view = null; } };
      },
    })];
  },
});
