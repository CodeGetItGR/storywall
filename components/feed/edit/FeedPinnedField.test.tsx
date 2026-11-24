import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedPinnedField } from '@/components/feed/edit/FeedPinnedField';
import type { PinnedPhoto } from '@/lib/feedPinned';
import en from '@/messages/en.json';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const photosOf = (...ids: string[]): PinnedPhoto[] => ids.map((id) => ({ id, image: { source: 'media', mediaId: `img-${id}` } }));
const media = (id: string) => `https://r2/${id}.jpg`;
const tools = en.InvitationEditor.sections;

function renderField(props: Partial<ComponentProps<typeof FeedPinnedField>> = {}) {
    const on = { onAdd: vi.fn(), onRemove: vi.fn(), onMove: vi.fn() };
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <FeedPinnedField photos={photosOf('a')} media={media} uploading={false} {...on} {...props} />
        </NextIntlClientProvider>,
    );
    return on;
}

describe('FeedPinnedField', () => {
    it('uploads a picked photo', () => {
        const on = renderField();
        const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
        fireEvent.change(screen.getByLabelText(en.FeedEditor.addPhoto), { target: { files: [file] } });
        expect(on.onAdd).toHaveBeenCalledExactlyOnceWith(file);
    });

    it('takes no photo while one uploads', () => {
        renderField({ uploading: true });
        expect(screen.getByLabelText(en.FeedEditor.addPhoto)).toBeDisabled();
    });

    it('drags a photo into a new place', async () => {
        // jsdom has no layout: each photo gets its own place in a row.
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
            const left = [...document.querySelectorAll('li')].findIndex((item) => item.contains(this)) * 100;
            return { x: left, y: 0, left, top: 0, right: left + 90, bottom: 90, width: 90, height: 90, toJSON: () => ({}) } as DOMRect;
        });
        const on = renderField({ photos: photosOf('a', 'b') });
        const handle = screen.getAllByRole('button', { name: tools.drag })[0];
        handle.focus();
        fireEvent.keyDown(handle, { code: 'Space' });
        await screen.findByRole('status');
        // The sensor listens for the arrows a tick after the drag starts, so the keys repeat until it hears them.
        await waitFor(() => {
            fireEvent.keyDown(document, { code: 'ArrowRight' });
            expect(screen.getByRole('status').textContent).toContain('2');
        });
        fireEvent.keyDown(document, { code: 'Space' });
        await waitFor(() => expect(on.onMove).toHaveBeenCalledExactlyOnceWith('a', 'b'));
    });

    it('removes a photo from its delete button', () => {
        const on = renderField();
        fireEvent.click(screen.getByRole('button', { name: tools.delete }));
        expect(on.onRemove).toHaveBeenCalledExactlyOnceWith('a');
    });

    it('tells the delete buttons apart', () => {
        renderField({ photos: photosOf('a', 'b') });
        const buttons = screen.getAllByRole('button', { name: tools.delete });
        expect(buttons[0]).toHaveAccessibleDescription('Photo 1 of 2');
        expect(buttons[1]).toHaveAccessibleDescription('Photo 2 of 2');
    });

    it('has no add tile once six are in', () => {
        renderField({ photos: photosOf('a', 'b', 'c', 'd', 'e', 'f') });
        expect(screen.queryByLabelText(en.FeedEditor.addPhoto)).toBeNull();
    });

    it('keeps the tools of a photo whose picture is gone, so the host can remove it', () => {
        renderField({ media: () => undefined });
        expect(screen.queryByRole('img')).toBeNull();
        expect(screen.getByRole('button', { name: tools.delete })).toBeTruthy();
    });
});
