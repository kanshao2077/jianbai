import { Extension, InputRule } from '@tiptap/core';

/** Convert the bullet already created by "- " when its checkbox is typed. */
export const MarkdownTaskInput = Extension.create({
  name: 'markdownTaskInput',
  priority: 1100,
  addInputRules() {
    return [new InputRule({
      find: /^\[([ xX])\]\s$/,
      handler: ({ range, match, chain }) => {
        if (!this.editor.isActive('bulletList')) return null;
        chain()
          .deleteRange(range)
          .toggleTaskList()
          .updateAttributes('taskItem', { checked: match[1].toLowerCase() === 'x' })
          .run();
      },
    })];
  },
});
