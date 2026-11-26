import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { FeedWishbookBlock } from '@/components/feed/modules/FeedWishbookBlock';
import en from '@/messages/en.json';

afterEach(cleanup);

// jsdom has no element scrolling.
const scrollTo = vi.fn();
beforeAll(() => {
    Element.prototype.scrollTo = scrollTo;
});

const wish = (id: string, message: string | null = `Wish ${id}`) => ({
    id,
    guestName: `Guest ${id}`,
    message,
    audio: null,
    createdAt: '2026-11-20T12:00:00Z',
});
const base: ComponentProps<typeof FeedWishbookBlock> = {
    name: 'Wishbook',
    wishes: [wish('1'), wish('2'), wish('3')],
    loading: false,
    isHost: true,
    writeHref: null,
    listHref: '/events/e1/tools/wishbook',
    total: 18,
    available: true,
};

function renderBlock(props: Partial<ComponentProps<typeof FeedWishbookBlock>> = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={en} timeZone="Europe/Athens">
            <FeedWishbookBlock {...base} {...props} />
        </NextIntlClientProvider>,
    );
}

describe('FeedWishbookBlock', () => {
    it("shows a host everyone's newest wishes with who wrote them, and the link to all of them", () => {
        renderBlock();
        expect(screen.getByText('Wish 1')).toBeTruthy();
        expect(screen.getByText(/Guest 1/)).toBeTruthy();
        expect(screen.getByRole('link', { name: 'All wishes (18)' })).toHaveAttribute('href', '/events/e1/tools/wishbook');
        expect(screen.queryByRole('link', { name: en.FeedModuleBlocks.wishWrite })).toBeNull();
    });

    it('marks the card in view with the dots, and a dot moves to its card', () => {
        renderBlock();
        const dots = screen.getAllByRole('button', { name: /^Wish \d of 3$/ });
        expect(dots).toHaveLength(3);
        expect(dots[0]).toHaveAttribute('aria-current', 'true');
        fireEvent.click(dots[2]);
        expect(dots[2]).toHaveAttribute('aria-current', 'true');
        expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    });

    it('has no dots for a single wish', () => {
        renderBlock({ wishes: [wish('1')], total: 1 });
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('gives a guest the Write button and the link to their own wishes', () => {
        renderBlock({ isHost: false, writeHref: '/events/e1/tools/wishbook', listHref: '/events/e1/tools/wishbook#my-wishes-title', total: 2 });
        expect(screen.getByRole('link', { name: en.FeedModuleBlocks.wishWrite })).toHaveAttribute('href', '/events/e1/tools/wishbook');
        expect(screen.getByRole('link', { name: 'Your wishes (2)' })).toHaveAttribute('href', '/events/e1/tools/wishbook#my-wishes-title');
    });

    it('asks a guest with no wishes for theirs', () => {
        renderBlock({ isHost: false, wishes: [], total: 0, listHref: null, writeHref: '/events/e1/tools/wishbook' });
        expect(screen.getByText(en.FeedModuleBlocks.wishWriteYours)).toBeTruthy();
        expect(screen.queryByRole('link', { name: /Your wishes/ })).toBeNull();
    });

    it('tells a host there are no wishes yet', () => {
        renderBlock({ wishes: [], total: 0, listHref: null });
        expect(screen.getByText(en.FeedModuleBlocks.wishNone)).toBeTruthy();
    });

    it('shows a voice-only wish with its player', () => {
        renderBlock({ wishes: [{ ...wish('1', null), audio: { url: 'https://cdn.test/a.m4a', durationMs: 12000 } }] as never, total: 1 });
        expect(screen.queryByText('Wish 1')).toBeNull();
        expect(screen.getByText(/Guest 1/)).toBeTruthy();
        expect(document.querySelector('audio')).not.toBeNull();
    });

    it('turns the button off once the module is gone', () => {
        renderBlock({ wishes: [], total: 0, listHref: null, available: false });
        expect(screen.getByRole('button', { name: en.FeedModuleBlocks.wishWrite })).toBeDisabled();
    });
});
