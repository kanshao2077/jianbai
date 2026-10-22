/** Recognize Markdown heading lines carried in otherwise ordinary clipboard HTML. */
export function normalizeMarkdownHeadingsHTML(html: string): string {
  if (!html.includes('#')) return html;
  const document = new DOMParser().parseFromString(html, 'text/html');
  // Internal copies already describe the intended editor nodes, including literal # text.
  if (document.body.querySelector('[data-pm-slice]')) return html;

  let changed = false;
  document.body.querySelectorAll('p, div').forEach(block => {
    if (block.closest('pre, code, table, h1, h2, h3, h4, h5, h6')
      || block.querySelector('p, div, pre, table, ul, ol, blockquote, h1, h2, h3, h4, h5, h6, code br')) return;

    const lines: DocumentFragment[] = [];
    const range = document.createRange();
    range.setStart(block, 0);
    block.querySelectorAll('br').forEach(br => {
      range.setEndBefore(br);
      lines.push(range.cloneContents());
      range.setStartAfter(br);
    });
    range.setEnd(block, block.childNodes.length);
    lines.push(range.cloneContents());

    const headings = lines.map(line => {
      const text = line.textContent || '';
      const match = /^( {0,3})(#{1,6})(?:[\t ]+|$)/.exec(text);
      if (!match || /[\r\n]/.test(text)) return null;
      const markerStart = match[1].length;
      if (isInlineCode(line, markerStart, markerStart + match[2].length)) return null;
      const closing = /[\t ]+(#+)[\t ]*$/.exec(text);
      const closingStart = closing ? closing.index + closing[0].indexOf('#') : -1;
      return {
        level: match[2].length,
        prefix: match[0].length,
        closing: closing && !isInlineCode(line, closingStart, closingStart + closing[1].length)
          ? closing.index : null,
      };
    });
    if (!headings.some(Boolean)) return;

    const replacement = document.createDocumentFragment();
    let paragraph: HTMLParagraphElement | null = null;
    lines.forEach((line, index) => {
      const heading = headings[index];
      if (heading) {
        if (heading.closing !== null) removeText(line, heading.closing, (line.textContent || '').length);
        removeText(line, 0, heading.prefix);
        const node = document.createElement(`h${heading.level}`);
        node.append(line);
        replacement.append(node);
        paragraph = null;
      } else {
        if (!paragraph) {
          paragraph = document.createElement('p');
          replacement.append(paragraph);
        } else paragraph.append(document.createElement('br'));
        paragraph.append(line);
      }
    });
    block.replaceWith(replacement);
    changed = true;
  });
  return changed ? document.body.innerHTML : html;
}

function isInlineCode(root: DocumentFragment, from: number, to: number): boolean {
  return textNodes(root).some(({ node, start, end }) => start < to && end > from
    && Boolean(node.parentElement?.closest('code')));
}

function textNodes(root: DocumentFragment): { node: Text; start: number; end: number }[] {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: { node: Text; start: number; end: number }[] = [];
  let offset = 0;
  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    const node = current as Text;
    nodes.push({ node, start: offset, end: offset + node.length });
    offset += node.length;
  }
  return nodes;
}

/** Remove only syntax text, retaining links and inline formatting around the title. */
function removeText(root: DocumentFragment, from: number, to: number): void {
  textNodes(root).forEach(({ node, start, end }) => {
    if (start >= to || end <= from) return;
    node.data = node.data.slice(0, Math.max(0, from - start)) + node.data.slice(to - start);
  });
}
