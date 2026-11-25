import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextColorPicker } from '@/components/saveMyDate/editor/text/TextColorPicker';
import en from '@/messages/en.json';

const THEME_COLORS = ['#B8DFD3', '#EFE7EC', '#2F2B2D'];

function renderPicker(value = '#2f2b2d') {
    const onPick = vi.fn();
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <TextColorPicker value={value} themeColors={THEME_COLORS} onPick={onPick} />
        </NextIntlClientProvider>,
    );
    return onPick;
}

async function open() {
    fireEvent.click(screen.getByRole('button', { name: 'Text color' }));
    return screen.findByRole('dialog');
}

describe('TextColorPicker', () => {
    afterEach(cleanup);

    it('colours this text with a swatch, and marks the current colour', async () => {
        const onPick = renderPicker();
        const popup = await open();

        expect(within(popup).getByRole('radio', { name: 'This text' })).toBeChecked();
        expect(within(popup).getByRole('button', { name: '#2F2B2D' })).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(within(popup).getByRole('button', { name: '#B8DFD3' }));
        expect(onPick).toHaveBeenCalledWith('#B8DFD3', 'text');
    });

    it('colours the section or every text when chosen, and starts on this text again', async () => {
        const onPick = renderPicker();
        let popup = await open();

        fireEvent.click(within(popup).getByRole('radio', { name: 'Every text' }));
        expect(within(popup).getByRole('radio', { name: 'Every text' })).toBeChecked();
        fireEvent.click(within(popup).getByRole('button', { name: '#EFE7EC' }));
        expect(onPick).toHaveBeenLastCalledWith('#EFE7EC', 'all');

        popup = await open();
        expect(within(popup).getByRole('radio', { name: 'This text' })).toBeChecked();
        fireEvent.click(within(popup).getByRole('radio', { name: 'This section' }));
        fireEvent.click(within(popup).getByRole('button', { name: '#2F2B2D' }));
        expect(onPick).toHaveBeenLastCalledWith('#2F2B2D', 'section');
    });

    it('colours the text with a mixed colour on Done only, for the texts chosen', async () => {
        const onPick = renderPicker('#FF7A59');
        const popup = await open();

        fireEvent.click(within(popup).getByRole('radio', { name: 'This section' }));
        fireEvent.click(within(popup).getByRole('button', { name: 'More colors' }));
        fireEvent.keyDown(await screen.findByRole('slider', { name: 'Hue' }), { key: 'ArrowRight', keyCode: 39, which: 39 });
        expect(onPick).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(onPick).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/^#[0-9A-F]{6}$/), 'section');
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });
});
