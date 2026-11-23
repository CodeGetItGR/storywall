import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedTextToolbar } from '@/components/saveMyDate/editor/text/FeedTextToolbar';
import type { TextToolbarState } from '@/hooks/useTextToolbar';
import en from '@/messages/en.json';

beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            disconnect() {}
        },
    );
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const toolbar = {
    size: 32,
    sizes: [24, 32, 40],
    color: '#333333',
    swatches: ['#333333'],
    bold: false,
    italic: false,
    setSize: vi.fn(),
    toggleBold: vi.fn(),
    toggleItalic: vi.fn(),
    pickColor: vi.fn(),
    add: vi.fn(),
    lock: null,
    lockHref: undefined,
} as unknown as TextToolbarState;

function renderToolbar() {
    const on = { onAddLink: vi.fn(), onDelete: vi.fn(), onPreset: vi.fn() };
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <FeedTextToolbar toolbar={toolbar} anchor={null} canAdd presets={[]} text="Maria & Nikos" {...on} />
        </NextIntlClientProvider>,
    );
    return on;
}

describe('FeedTextToolbar', () => {
    it('has +, Style, size, colour, bold, italic and delete, and no alignment, line spacing or font', () => {
        renderToolbar();
        const editor = en.InvitationEditor;
        for (const name of [editor.addText, en.FeedEditor.style, editor.textColor, editor.bold, editor.italic, editor.deleteText]) {
            expect(screen.getByRole('button', { name })).toBeTruthy();
        }
        expect(screen.getByRole('combobox', { name: editor.fontSize })).toBeTruthy();
        expect(screen.queryByRole('combobox', { name: editor.lineHeight })).toBeNull();
        expect(screen.queryByRole('button', { name: editor.alignLeft })).toBeNull();
    });

    it('adds a link from the + menu', async () => {
        const on = renderToolbar();
        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.addText }));
        fireEvent.click(await screen.findByText(en.InvitationEditor.sectionSettings.link));
        expect(on.onAddLink).toHaveBeenCalled();
    });

    it('colours only this text: the colour picker offers no other scope', async () => {
        renderToolbar();
        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.textColor }));
        await screen.findByText(en.InvitationEditor.moreColors);
        expect(screen.queryByText(en.InvitationEditor.thisSection)).toBeNull();
    });
});
