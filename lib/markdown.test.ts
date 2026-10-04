import { describe, expect, it } from 'vitest';

import { parseMarkdown, parseMarkdownInline } from './markdown';

describe('parseMarkdownInline', () => {
    it('splits bold runs from plain text', () => {
        expect(parseMarkdownInline('Send **this form** back')).toEqual([
            { text: 'Send ', bold: false },
            { text: 'this form', bold: true },
            { text: ' back', bold: false },
        ]);
    });
});

describe('parseMarkdownInline links', () => {
    it('reads a same-site link', () => {
        expect(parseMarkdownInline('See the [Privacy Policy](/legal/privacy).')).toEqual([
            { text: 'See the ', bold: false },
            { text: 'Privacy Policy', bold: false, href: '/legal/privacy' },
            { text: '.', bold: false },
        ]);
    });

    it('renders an unsafe link target as plain text', () => {
        for (const href of ['javascript:alert', '//evil.example', 'http://example.com']) {
            expect(parseMarkdownInline(`[click](${href})`)).toEqual([{ text: 'click', bold: false }]);
        }
    });

    it('turns an email address into a mailto link, keeping bold', () => {
        expect(parseMarkdownInline('Write to **help@storywall.gr** today')).toEqual([
            { text: 'Write to ', bold: false },
            { text: 'help@storywall.gr', bold: true, href: 'mailto:help@storywall.gr' },
            { text: ' today', bold: false },
        ]);
    });
});

describe('parseMarkdown', () => {
    it('reads headings, paragraphs and lists', () => {
        const blocks = parseMarkdown('# Right of withdrawal\r\n\r\nYou have\n14 days.\n\n- one\n- **two**\n\n1. first\n2. second');
        expect(blocks).toEqual([
            { type: 'heading', level: 1, content: [{ text: 'Right of withdrawal', bold: false }] },
            { type: 'paragraph', content: [{ text: 'You have 14 days.', bold: false }] },
            { type: 'list', ordered: false, items: [[{ text: 'one', bold: false }], [{ text: 'two', bold: true }]] },
            { type: 'list', ordered: true, items: [[{ text: 'first', bold: false }], [{ text: 'second', bold: false }]] },
        ]);
    });

    it('keeps a wrapped line with its list item', () => {
        expect(parseMarkdown('- a long\n  item')).toEqual([{ type: 'list', ordered: false, items: [[{ text: 'a long item', bold: false }]] }]);
    });

    it('drops a horizontal rule', () => {
        expect(parseMarkdown('First\n\n---\n\nSecond')).toEqual([
            { type: 'paragraph', content: [{ text: 'First', bold: false }] },
            { type: 'paragraph', content: [{ text: 'Second', bold: false }] },
        ]);
    });
});
