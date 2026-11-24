import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedModeSwitch } from '@/components/feed/layout/FeedModeSwitch';
import el from '@/messages/el.json';
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
        expect(screen.getByRole('button', { name: en.FeedLayout.socialFeed }).getAttribute('aria-pressed')).toBe('true');
        expect(document.querySelector('[data-feed-mode-thumb]')?.className).toContain('translate-x-full');
    });

    it('picks a mode', async () => {
        const onSelect = renderSwitch('invitation');
        await userEvent.click(screen.getByRole('button', { name: en.FeedLayout.socialFeed }));
        expect(onSelect).toHaveBeenCalledExactlyOnceWith('feed');
    });

    it('is 40 px tall, each half 32 px to look at and 40 px to tap', () => {
        renderSwitch('invitation');
        const half = screen.getByRole('button', { name: en.FeedLayout.invitation });
        expect(half.parentElement).toHaveClass('h-10', 'p-1');
        expect(half).toHaveClass('h-8', 'text-[13px]', 'before:-inset-y-1');
    });

    it('names the second half Social Feed, in both languages', () => {
        expect(en.FeedLayout.socialFeed).toBe('Social Feed');
        expect(el.FeedLayout.socialFeed).toBe('Social Feed');
        expect('posts' in en.FeedLayout).toBe(false);
        expect(en.FeedEditor.themes).toBe('Themes');
        expect(el.FeedEditor.themes).toBe('Θέματα');
    });
});
