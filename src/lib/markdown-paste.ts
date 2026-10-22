import { normalizeMarkdownHeadingsHTML } from './markdown-headings-paste';

/** Preserve checked state when a webpage supplies GitHub-style task-list HTML. */
export function normalizeTaskListHTML(html: string): string {
  if (!html.includes('task-list-item')) return html;
  const document = new DOMParser().parseFromString(html, 'text/html');
  normalizeTaskListElement(document.body);
  return document.body.innerHTML;
}

export function normalizeTaskListElement(element: HTMLElement): void {
  element.querySelectorAll('li.task-list-item').forEach(item => {
    const checkbox = Array.from(item.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
      .find(input => input.closest('li') === item);
    if (!checkbox) return;
    item.setAttribute('data-type', 'taskItem');
    item.setAttribute('data-checked', String(checkbox.checked));
    item.parentElement?.setAttribute('data-type', 'taskList');
    const content = checkbox.parentElement;
    checkbox.remove();
    const first = content?.firstChild;
    if (first?.nodeType === Node.TEXT_NODE) first.textContent = first.textContent?.replace(/^[\t ]/, '') || '';

    // Renderer indentation before a nested list must not become a hard break.
    Array.from(item.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.nextSibling instanceof Element
        && node.nextSibling.matches('ul, ol')) {
        node.textContent = node.textContent?.replace(/[\t\r\n ]+$/, '') || '';
      }
    });
  });
}

export function normalizePastedHTML(html: string): string {
  return normalizeTaskListHTML(normalizeMarkdownHeadingsHTML(html));
}
