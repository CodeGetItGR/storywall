// A deliberately small Markdown reader for the backend's legal texts, which use
// headings, bold, links, lists and paragraphs only. Everything renders as React
// text nodes, never as raw HTML.

// `href` is set only for a link: a [text](href) whose target passes safeHref,
// or an email address in the text, which becomes a mailto link.
export type MarkdownInline = { text: string; bold: boolean; href?: string };

export type MarkdownBlock =
    | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; content: MarkdownInline[] }
    | { type: 'paragraph'; content: MarkdownInline[] }
    | { type: 'list'; ordered: boolean; items: MarkdownInline[][] };

const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^(?:-{3,}|\*{3,}|_{3,})$/;
const UNORDERED_ITEM = /^\s*[-*+]\s+(.*)$/;
const ORDERED_ITEM = /^\s*\d+[.)]\s+(.*)$/;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// Same-site paths, in-page anchors, mailto and https only. Anything else (javascript:,
// protocol-relative //host, http) renders as plain text.
function safeHref(href: string): string | null {
    if (href.startsWith('/') && !href.startsWith('//')) return href;
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('https://')) return href;
    return null;
}

function linkEmails(part: MarkdownInline): MarkdownInline[] {
    if (part.href) return [part];
    const parts: MarkdownInline[] = [];
    let last = 0;
    for (const match of part.text.matchAll(EMAIL)) {
        const index = match.index ?? 0;
        if (index > last) parts.push({ text: part.text.slice(last, index), bold: part.bold });
        parts.push({ text: match[0], bold: part.bold, href: `mailto:${match[0]}` });
        last = index + match[0].length;
    }
    if (last === 0) return [part];
    if (last < part.text.length) parts.push({ text: part.text.slice(last), bold: part.bold });
    return parts;
}

export function parseMarkdownInline(text: string): MarkdownInline[] {
    const parts: MarkdownInline[] = [];
    const pattern = /\*\*(.+?)\*\*|__(.+?)__|\[([^\]]+)\]\(([^)\s]+)\)/g;
    let last = 0;
    for (const match of text.matchAll(pattern)) {
        const index = match.index ?? 0;
        if (index > last) parts.push({ text: text.slice(last, index), bold: false });
        if (match[3] !== undefined) {
            const href = safeHref(match[4]);
            parts.push(href ? { text: match[3], bold: false, href } : { text: match[3], bold: false });
        } else {
            parts.push({ text: match[1] ?? match[2] ?? '', bold: true });
        }
        last = index + match[0].length;
    }
    if (last < text.length) parts.push({ text: text.slice(last), bold: false });
    return parts.flatMap(linkEmails);
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

        // A horizontal rule only separates blocks; the headings already do that visually.
        if (RULE.test(line.trim())) {
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
