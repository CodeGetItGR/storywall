import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextColorPicker } from '@/components/saveMyDate/editor/text/TextColorPicker';
import en from '@/messages/en.json';

const SWATCHES = ['#b8dfd3', '#efe7ec', '#2f2b2d'];

function renderPicker(value = '#2f2b2d') {
    const onPick = vi.fn();
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <TextColorPicker value={value} swatches={SWATCHES} onPick={onPick} />
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
        expect(within(popup).getByRole('button', { name: '#2f2b2d' })).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(within(popup).getByRole('button', { name: '#b8dfd3' }));
        expect(onPick).toHaveBeenCalledWith('#b8dfd3', 'text');
    });

    it('colours the section or every text when chosen, and starts on this text again', async () => {
        const onPick = renderPicker();
        let popup = await open();

        fireEvent.click(within(popup).getByRole('radio', { name: 'Every text' }));
        expect(within(popup).getByRole('radio', { name: 'Every text' })).toBeChecked();
        fireEvent.click(within(popup).getByRole('button', { name: '#efe7ec' }));
        expect(onPick).toHaveBeenLastCalledWith('#efe7ec', 'all');

        popup = await open();
        expect(within(popup).getByRole('radio', { name: 'This text' })).toBeChecked();
        fireEvent.click(within(popup).getByRole('radio', { name: 'This section' }));
        fireEvent.click(within(popup).getByRole('button', { name: '#2f2b2d' }));
        expect(onPick).toHaveBeenLastCalledWith('#2f2b2d', 'section');
    });

    it('applies a colour from the full picker only on Apply', async () => {
        const onPick = renderPicker('#123456');
        const popup = await open();

        fireEvent.click(within(popup).getByRole('button', { name: 'More colors' }));
        expect(within(popup).queryByRole('button', { name: '#b8dfd3' })).not.toBeInTheDocument();
        fireEvent.click(within(popup).getByRole('button', { name: 'Cancel' }));
        expect(within(popup).getByRole('button', { name: '#b8dfd3' })).toBeInTheDocument();

        fireEvent.click(within(popup).getByRole('button', { name: 'More colors' }));
        expect(onPick).not.toHaveBeenCalled();
        fireEvent.click(within(popup).getByRole('button', { name: 'Apply' }));
        expect(onPick).toHaveBeenCalledWith('#123456', 'text');
    });
});
