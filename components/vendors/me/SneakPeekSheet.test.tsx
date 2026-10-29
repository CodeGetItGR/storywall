import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SneakPeekSheet } from '@/components/vendors/me/SneakPeekSheet';
import type { MediaResponseDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

// The caption limit comes from the app config; its fallback is enough here.
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));

const items = Array.from({ length: 21 }, (_, i) => ({ id: `m${i}`, mediaUrl: `https://cdn.test/m${i}.jpg`, thumbnailUrl: null, mediaType: 'IMAGE', status: 'READY' }) as unknown as MediaResponseDto);

function renderSheet(overrides: Partial<Parameters<typeof SneakPeekSheet>[0]> = {}) {
    const props = {
        open: true,
        mode: 'new' as const,
        items: items.slice(0, 3),
        initialPicked: [],
        initialCaption: null,
        hasMore: false,
        isSaving: false,
        error: null,
        onLoadMoreAction: vi.fn(),
        onSubmitAction: vi.fn(),
        onCloseAction: vi.fn(),
        ...overrides,
    };
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <SneakPeekSheet {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

describe('SneakPeekSheet', () => {
    afterEach(cleanup);

    it('shares the picks in tap order with the caption', () => {
        const props = renderSheet();
        expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Choose photo 3' }));
        fireEvent.click(screen.getByRole('button', { name: 'Choose photo 1' }));
        expect(screen.getByText('2 of 20 chosen')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Caption (optional)'), { target: { value: 'First look' } });
        fireEvent.click(screen.getByRole('button', { name: 'Share' }));
        expect(props.onSubmitAction).toHaveBeenCalledWith({ mediaIds: ['m2', 'm0'], content: 'First look' });
    });

    it('stops at 20', () => {
        renderSheet({ items, initialPicked: items.slice(0, 20).map((item) => item.id) });
        expect(screen.getByText('20 of 20 chosen')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Choose photo 21' }));
        expect(screen.getByText('20 of 20 chosen')).toBeInTheDocument();
    });

    it('edits: starts from the post, saves only the change', () => {
        const props = renderSheet({ mode: 'edit', initialPicked: ['m0', 'm1'], initialCaption: 'Hi' });
        expect(screen.getByLabelText('Caption (optional)')).toHaveValue('Hi');
        fireEvent.click(screen.getByRole('button', { name: 'Remove photo 2' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(props.onSubmitAction).toHaveBeenCalledWith({ mediaIds: ['m0'] });
    });

    it('shows the error and loads more', () => {
        const props = renderSheet({ error: 'Pick from your own Pro photos and videos.', hasMore: true });
        expect(screen.getByRole('alert')).toHaveTextContent('Pick from your own Pro photos and videos.');
        fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
        expect(props.onLoadMoreAction).toHaveBeenCalled();
    });
});
