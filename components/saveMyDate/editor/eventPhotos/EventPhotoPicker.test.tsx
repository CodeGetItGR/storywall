import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storyMedia } from '@/.storybook/fixtures';
import { EventPhotoPicker } from '@/components/saveMyDate/editor/eventPhotos/EventPhotoPicker';
import en from '@/messages/en.json';

const media = vi.hoisted(() => ({ current: { data: undefined as unknown, isLoading: false } }));

vi.mock('@/hooks/useMedia', () => ({
    useEventMedia: () => ({ ...media.current, hasNextPage: false, fetchNextPage: vi.fn(), isFetchingNextPage: false }),
}));

const copy = en.InvitationEditor.eventPhotos;

function showPhotos(ids: string[]) {
    media.current = { data: { pages: [{ content: ids.map((id) => storyMedia(id)), page: { number: 0, totalPages: 1, size: 30, totalElements: ids.length } }] }, isLoading: false };
}

function renderPicker(props: { selectedIds?: string[]; limit?: number; onChange?: (ids: string[]) => void } = {}) {
    const onChange = props.onChange ?? vi.fn();
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <EventPhotoPicker open onClose={vi.fn()} eventId="evt-1" selectedIds={props.selectedIds ?? []} limit={props.limit ?? 9} onChange={onChange} />
        </NextIntlClientProvider>,
    );
    return onChange;
}

afterEach(cleanup);

describe('EventPhotoPicker', () => {
    it("lists the event's photos, each with its own alt text, and says which are picked", () => {
        showPhotos(['a', 'b']);
        renderPicker({ selectedIds: ['b'] });

        expect(screen.getByRole('heading', { name: copy.title })).toBeInTheDocument();
        expect(screen.getByAltText('Event photo 1').closest('button')).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByAltText('Event photo 2').closest('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('adds a photo on a tap and takes a picked one out', () => {
        showPhotos(['a', 'b']);
        const onChange = renderPicker({ selectedIds: ['b'] });

        fireEvent.click(screen.getByAltText('Event photo 1'));
        expect(onChange).toHaveBeenLastCalledWith(['b', 'a']);
        fireEvent.click(screen.getByAltText('Event photo 2'));
        expect(onChange).toHaveBeenLastCalledWith([]);
    });

    it('takes no more once the gallery is full', () => {
        showPhotos(['a', 'b']);
        renderPicker({ selectedIds: ['b'], limit: 1 });

        expect(screen.getByAltText('Event photo 1').closest('button')).toBeDisabled();
        expect(screen.getByAltText('Event photo 2').closest('button')).toBeEnabled();
    });

    it('says when the event has no photos', () => {
        showPhotos([]);
        renderPicker();

        expect(screen.getByText(copy.empty)).toBeInTheDocument();
    });
});
