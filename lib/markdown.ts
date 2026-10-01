// A deliberately small Markdown reader for the backend's legal texts, which use
// headings, bold, lists and paragraphs only. Everything renders as React text
// nodes, never as raw HTML.

export type MarkdownInline = { text: string; bold: boolean };

export type MarkdownBlock =
    | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; content: MarkdownInline[] }
    | { type: 'paragraph'; content: MarkdownInline[] }
    | { type: 'list'; ordered: boolean; items: MarkdownInline[][] };

const HEADING = /^(#{1,6})\s+(.*)$/;
const UNORDERED_ITEM = /^\s*[-*+]\s+(.*)$/;
const ORDERED_ITEM = /^\s*\d+[.)]\s+(.*)$/;

export function parseMarkdownInline(text: string): MarkdownInline[] {
    const parts: MarkdownInline[] = [];
    const pattern = /\*\*(.+?)\*\*|__(.+?)__/g;
    let last = 0;
    for (const match of text.matchAll(pattern)) {
        const index = match.index ?? 0;
        if (index > last) parts.push({ text: text.slice(last, index), bold: false });
        parts.push({ text: match[1] ?? match[2] ?? '', bold: true });
        last = index + match[0].length;
    }
    if (last < text.length) parts.push({ text: text.slice(last), bold: false });
    return parts;
}

export function parseMarkdown(source: string): MarkdownBlock[] {
    const blocks: MarkdownBlock[] = [];
    let paragraph: string[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;

    const flushParagraph = () => {
        if (paragraph.length > 0) blocks.push({ type: 'paragraph', content: parseMarkdownInline(paragraph.join(' ')) });
        paragraph = [];
    };
    const flushList = () => {
        if (list) blocks.push({ type: 'list', ordered: list.ordered, items: list.items.map(parseMarkdownInline) });
        list = null;
    };

    for (const rawLine of source.split(/\r?\n/)) {
        const line = rawLine.trimEnd();
        if (!line.trim()) {
            flushParagraph();
            flushList();
            continue;
        }

        const heading = HEADING.exec(line.trim());
        if (heading) {
            flushParagraph();
            flushList();
            blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6, content: parseMarkdownInline(heading[2]) });
            continue;
        }

        const unordered = UNORDERED_ITEM.exec(line);
        const ordered = unordered ? null : ORDERED_ITEM.exec(line);
        const item = unordered ?? ordered;
        if (item) {
            flushParagraph();
            const isOrdered = Boolean(ordered);
            if (list && list.ordered !== isOrdered) flushList();
            list ??= { ordered: isOrdered, items: [] };
            list.items.push(item[1]);
            continue;
        }

        // A plain line right after a list item continues that item.
        if (list) {
            list.items[list.items.length - 1] += ` ${line.trim()}`;
            continue;
        }
        paragraph.push(line.trim());
    }

    flushParagraph();
    flushList();
    return blocks;
}
