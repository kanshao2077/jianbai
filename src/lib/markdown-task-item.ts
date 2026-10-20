import { TaskItem } from '@tiptap/extension-list';
import { normalizeTaskListElement } from './markdown-paste';

// Keep the default Markdown serializer and normalize generated task-list HTML.
export const MarkdownTaskItem = TaskItem.extend({
  addStorage() {
    return {
      markdown: {
        parse: { updateDOM: normalizeTaskListElement },
      },
    };
  },
});
