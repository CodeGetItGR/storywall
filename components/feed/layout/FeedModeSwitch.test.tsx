import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedModeSwitch } from '@/components/feed/layout/FeedModeSwitch';
import en from '@/messages/en.json';

afterEach(cleanup);

function renderSwitch(mode: 'invitation' | 'feed', onSelect = vi.fn()) {
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <FeedModeSwitch mode={mode} onSelect={onSelect} />
        </NextIntlClientProvider>,
    );
    return onSelect;
}

describe('FeedModeSwitch', () => {
    it('shows both halves, the chosen one pressed, with the thumb under it', () => {
        renderSwitch('feed');
        expect(screen.getByRole('button', { name: en.FeedLayout.invitation }).getAttribute('aria-pressed')).toBe('false');
        expect(screen.getByRole('button', { name: en.FeedLayout.posts }).getAttribute('aria-pressed')).toBe('true');
        expect(document.querySelector('[data-feed-mode-thumb]')?.className).toContain('translate-x-full');
    });

    it('picks a mode', async () => {
        const onSelect = renderSwitch('invitation');
        await userEvent.click(screen.getByRole('button', { name: en.FeedLayout.posts }));
        expect(onSelect).toHaveBeenCalledExactlyOnceWith('feed');
    });
});
