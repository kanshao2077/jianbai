import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection, type EditorState } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

type SelectionDrag = {
  source: EditorView;
  sourceState: EditorState;
  from: number;
  to: number;
};

let activeDrag: SelectionDrag | null = null;
let armedElement: HTMLElement | null = null;
let removeMouseUpListener: (() => void) | null = null;

function disarmSelection(): void {
  armedElement?.removeAttribute('draggable');
  armedElement = null;
  removeMouseUpListener?.();
  removeMouseUpListener = null;
}

function finishDrag(): void {
  activeDrag = null;
  disarmSelection();
}

function selectionElementAt(view: EditorView, event: MouseEvent): HTMLElement | null {
  const selection = view.state.selection;
  if (!(selection instanceof TextSelection) || selection.empty) return null;
  const position = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!position || position.pos < selection.from || position.pos > selection.to) return null;
  return view.dom;
}

function armSelection(view: EditorView, event: MouseEvent, untilMouseUp = false): void {
  const nextElement = selectionElementAt(view, event);
  if (!nextElement) {
    if (!activeDrag) disarmSelection();
    return;
  }
  if (armedElement !== nextElement) {
    disarmSelection();
    armedElement = nextElement;
  }
  armedElement.setAttribute('draggable', 'true');

  if (!untilMouseUp) return;

  const ownerDocument = view.dom.ownerDocument;
  const handleMouseUp = () => disarmSelection();
  ownerDocument.addEventListener('mouseup', handleMouseUp, { capture: true, once: true });
  removeMouseUpListener = () => ownerDocument.removeEventListener('mouseup', handleMouseUp, true);
}

function beginDrag(view: EditorView, event: DragEvent): void {
  const selection = view.state.selection;
  if (!(selection instanceof TextSelection) || selection.empty || !event.dataTransfer) return;
  const position = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!position || position.pos < selection.from || position.pos > selection.to) return;

  finishDrag();
  activeDrag = {
    source: view,
    sourceState: view.state,
    from: selection.from,
    to: selection.to,
  };
  event.dataTransfer.effectAllowed = 'move';
}

function keepMoveEffect(event: DragEvent): void {
  if (!activeDrag) return;
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
}

/** Enable native selected-text dragging and complete moves between separate editor views. */
export const SelectedTextDrag = Extension.create({
  name: 'selectedTextDrag',
  priority: 1200,

  addProseMirrorPlugins() {
    const key = new PluginKey('selectedTextDrag');

    return [new Plugin({
      key,
      props: {
        dragCopies: () => false,
        handleDOMEvents: {
          mousemove(view, event) {
            if (event.buttons === 0) armSelection(view, event);
            return false;
          },
          mousedown(view, event) {
            if (event.button === 0) armSelection(view, event, true);
            return false;
          },
          mouseleave() {
            if (!activeDrag) disarmSelection();
            return false;
          },
          dragstart(view, event) {
            beginDrag(view, event);
            return false;
          },
          dragover(_view, event) {
            keepMoveEffect(event);
            return false;
          },
          dragend() {
            finishDrag();
            return false;
          },
        },
        handleDrop(view) {
          const drag = activeDrag;
          if (!drag) return false;
          if (drag.source === view) {
            window.setTimeout(finishDrag, 0);
            return false;
          }

          const targetBeforeDrop = view.state.doc;
          window.setTimeout(() => {
            const inserted = !view.state.doc.eq(targetBeforeDrop);
            const sourceUnchanged = !drag.source.isDestroyed
              && drag.source.state.doc.eq(drag.sourceState.doc);
            if (inserted && sourceUnchanged) {
              drag.source.dispatch(
                drag.source.state.tr
                  .delete(drag.from, drag.to)
                  .scrollIntoView()
                  .setMeta('uiEvent', 'drop'),
              );
            }
            finishDrag();
          }, 0);
          return false;
        },
      },
      view(view) {
        return {
          destroy() {
            if (activeDrag?.source === view) finishDrag();
          },
        };
      },
    })];
  },
});
