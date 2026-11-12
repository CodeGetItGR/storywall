import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TextToolbar } from '@/components/saveMyDate/editor/text/TextToolbar';
import type { TextToolbarState } from '@/hooks/useTextToolbar';
import { INVITATION_FONTS, THEME_FONT } from '@/lib/invitation/textEditing';
import en from '@/messages/en.json';

let isWide = true;

function toolbarState(overrides: Partial<TextToolbarState> = {}): TextToolbarState {
    return {
        font: THEME_FONT,
        fontLabel: undefined,
        fonts: [...INVITATION_FONTS],
        size: 20,
        sizes: [16, 20, 24],
        color: '#2f2b2d',
        swatches: ['#2f2b2d'],
        bold: false,
        italic: true,
        align: 'center',
        lineHeight: undefined,
        setFont: vi.fn(),
        setSize: vi.fn(),
        setLineHeight: vi.fn(),
        toggleBold: vi.fn(),
        toggleItalic: vi.fn(),
        setAlign: vi.fn(),
        pickColor: vi.fn(),
        add: vi.fn(),
        ...overrides,
    };
}

function renderToolbar(toolbar = toolbarState(), { canAdd = true, onDelete = vi.fn() } = {}) {
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <TextToolbar toolbar={toolbar} anchor={null} canAdd={canAdd} onDelete={onDelete} />
        </NextIntlClientProvider>,
    );
    return { toolbar, onDelete, bar: screen.getByRole('toolbar', { name: 'Text tools' }) };
}

describe('TextToolbar', () => {
    beforeEach(() => {
        isWide = true;
        vi.stubGlobal('matchMedia', (query: string) => ({ matches: isWide, media: query, addEventListener() {}, removeEventListener() {} }));
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

    it("shows the text's settings", () => {
        const { bar } = renderToolbar();
        expect(within(bar).getByRole('button', { name: 'Font' })).toHaveTextContent('Theme font');
        expect(within(bar).getByLabelText('Size')).toHaveValue('20');
        expect(within(bar).getByLabelText('Line spacing')).toHaveValue('');
        expect(within(bar).getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'false');
        expect(within(bar).getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true');
        expect(within(bar).getByRole('button', { name: 'Align center' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('sends each change', async () => {
        const { toolbar, onDelete, bar } = renderToolbar();
        fireEvent.click(within(bar).getByRole('button', { name: 'Bold' }));
        fireEvent.click(within(bar).getByRole('button', { name: 'Align right' }));
        fireEvent.change(within(bar).getByLabelText('Size'), { target: { value: '24' } });
        fireEvent.change(within(bar).getByLabelText('Line spacing'), { target: { value: '1.5' } });
        fireEvent.click(within(bar).getByRole('button', { name: 'Delete text' }));

        expect(toolbar.toggleBold).toHaveBeenCalledOnce();
        expect(toolbar.setAlign).toHaveBeenCalledWith('right');
        expect(toolbar.setSize).toHaveBeenCalledOnce();
        expect(toolbar.setLineHeight).toHaveBeenCalledOnce();
        expect(onDelete).toHaveBeenCalledOnce();

        fireEvent.click(within(bar).getByRole('button', { name: 'Font' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Lora' }));
        expect(toolbar.setFont).toHaveBeenCalledWith('Lora,serif');

        fireEvent.click(within(bar).getByRole('button', { name: 'Add text' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Subtitle' }));
        expect(toolbar.add).toHaveBeenCalledWith('subtitle');
    });

    it("names the text's own font and marks it in the list", async () => {
        const { bar } = renderToolbar(toolbarState({ font: "'Playfair Display',serif", fontLabel: 'Playfair Display' }));
        const trigger = within(bar).getByRole('button', { name: 'Font' });
        expect(trigger).toHaveTextContent('Playfair Display');

        fireEvent.click(trigger);
        expect(await screen.findByRole('button', { name: 'Playfair Display' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Theme font' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('cannot add a text where the section takes no more', () => {
        const { bar } = renderToolbar(undefined, { canAdd: false });
        expect(within(bar).getByRole('button', { name: 'Add text' })).toBeDisabled();
    });

    it('docks at the bottom on a phone and floats on a computer', () => {
        renderToolbar();
        expect(screen.getByRole('toolbar')).not.toHaveAttribute('data-docked');
        cleanup();

        isWide = false;
        renderToolbar();
        expect(screen.getByRole('toolbar')).toHaveAttribute('data-docked', 'true');
    });
});
