import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextStyleMenu } from '@/components/saveMyDate/editor/text/TextStyleMenu';
import type { TextStylePresetDto } from '@/lib/api/types';
import en from '@/messages/en.json';

afterEach(cleanup);

const PRESETS: TextStylePresetDto[] = [
    { id: 'a', nameEn: 'Classic', nameEl: 'Κλασικό', font: 'serif', size: 32, weight: 'NORMAL', italic: false, letterSpacing: 0, uppercase: false, sortOrder: 0 },
    { id: 'b', nameEn: 'Calligraphy', nameEl: 'Καλλιγραφικό', font: 'cursive', size: 40, weight: 'BOLD', italic: true, letterSpacing: 1, uppercase: false, sortOrder: 1 },
];

describe('TextStyleMenu', () => {
    it("draws each preset on the text's start and applies the one picked", async () => {
        const onPick = vi.fn();
        render(
            <NextIntlClientProvider locale="en" messages={en}>
                <TextStyleMenu presets={PRESETS} text="Maria & Nikos" onPick={onPick} />
            </NextIntlClientProvider>,
        );
        fireEvent.click(screen.getByRole('button', { name: en.FeedEditor.style }));
        const option = await screen.findByRole('button', { name: /Calligraphy/ });
        expect(option.textContent).toContain('Maria & Nikos');
        fireEvent.click(option);
        expect(onPick).toHaveBeenCalledWith(PRESETS[1]);
    });

    it('is disabled with no presets', () => {
        render(
            <NextIntlClientProvider locale="en" messages={en}>
                <TextStyleMenu presets={[]} text="x" onPick={vi.fn()} />
            </NextIntlClientProvider>,
        );
        expect(screen.getByRole('button', { name: en.FeedEditor.style }).hasAttribute('disabled')).toBe(true);
    });
});
