import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SneakPeekSection } from '@/components/vendors/me/SneakPeekSection';
import type { MediaResponseDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const thumbs = [
    { id: 'm1', mediaUrl: 'https://cdn.test/m1.jpg', thumbnailUrl: null, mediaType: 'IMAGE', status: 'READY' },
] as unknown as MediaResponseDto[];

function renderSection(overrides: Partial<Parameters<typeof SneakPeekSection>[0]> = {}) {
    const props = {
        state: 'ready' as const,
        thumbnails: [],
        fanItems: [],
        feedHref: '/events/e1/feed?post=p1',
        onChooseAction: vi.fn(),
        onEditAction: vi.fn(),
        onDeleteAction: vi.fn(),
        ...overrides,
    };
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <SneakPeekSection {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

describe('SneakPeekSection', () => {
    afterEach(cleanup);

    it('waits for the start with the button disabled', () => {
        renderSection({ state: 'notOpen' });
        expect(screen.getByText('You can share it once the event starts.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Choose photos' })).toBeDisabled();
    });

    it('asks for Pro items first', () => {
        renderSection({ state: 'noItems' });
        expect(screen.getByText('Add photos or videos to your Pro album first.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Choose photos' })).toBeDisabled();
    });

    it('opens the sheet when ready', () => {
        const props = renderSection();
        fireEvent.click(screen.getByRole('button', { name: 'Choose photos' }));
        expect(props.onChooseAction).toHaveBeenCalled();
    });

    it('shows a posted one with edit, delete and the feed link', () => {
        const props = renderSection({ state: 'posted', thumbnails: thumbs });
        expect(screen.getByAltText('Sneak peek photo 1')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'See it in the feed' })).toHaveAttribute('href', '/events/e1/feed?post=p1');
        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(props.onEditAction).toHaveBeenCalled();
        expect(props.onDeleteAction).toHaveBeenCalled();
    });

    it('after access ends keeps only the link', () => {
        renderSection({ state: 'postedClosed', thumbnails: thumbs });
        expect(screen.getByRole('link', { name: 'See it in the feed' })).toBeInTheDocument();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('says it was used', () => {
        renderSection({ state: 'used' });
        expect(screen.getByText('You already shared your sneak peek for this event.')).toBeInTheDocument();
    });
});
