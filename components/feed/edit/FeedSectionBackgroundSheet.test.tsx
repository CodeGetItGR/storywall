import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedSectionBackgroundSheet } from '@/components/feed/edit/FeedSectionBackgroundSheet';
import en from '@/messages/en.json';

afterEach(cleanup);

function renderSheet(props: Partial<ComponentProps<typeof FeedSectionBackgroundSheet>> = {}) {
    const calls = { onColor: vi.fn(), onPickPhoto: vi.fn(), onRemovePhoto: vi.fn(), onClose: vi.fn() };
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <FeedSectionBackgroundSheet
                kind="color"
                isDesktop
                color={undefined}
                themeColors={['#7A3B2E']}
                hasPhoto={false}
                uploading={false}
                failed={false}
                {...calls}
                {...props}
            />
        </NextIntlClientProvider>,
    );
    return calls;
}

const byDefault = en.InvitationEditor.lineHeightDefault;
const tooDark = en.FeedEditor.background.tooDark;

describe('FeedSectionBackgroundSheet colour', () => {
    it("offers the theme's colours and the four, with no Default until one is picked", async () => {
        const { onColor } = renderSheet();
        expect(await screen.findByRole('dialog', { name: en.FeedEditor.background.color })).toBeTruthy();
        expect(screen.queryByRole('button', { name: byDefault })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: '#7A3B2E' }));
        expect(onColor).toHaveBeenCalledExactlyOnceWith('#7A3B2E');
    });

    it('goes back to the feed background with Default', async () => {
        const { onColor } = renderSheet({ color: '#B5BFA6' });
        fireEvent.click(await screen.findByRole('button', { name: byDefault }));
        expect(onColor).toHaveBeenCalledExactlyOnceWith(undefined);
    });

    it('says when a lighter shade will be drawn', async () => {
        renderSheet({ color: '#3A2A20' });
        expect(await screen.findByText(tooDark)).toBeTruthy();
        cleanup();
        renderSheet({ color: '#B5BFA6' });
        expect(await screen.findByRole('status')).toBeTruthy();
        expect(screen.queryByText(tooDark)).toBeNull();
    });
});

describe('FeedSectionBackgroundSheet photo', () => {
    it('changes and removes the photo', async () => {
        const { onRemovePhoto, onPickPhoto } = renderSheet({ kind: 'photo', hasPhoto: true });
        expect(await screen.findByRole('dialog', { name: en.FeedEditor.background.image })).toBeTruthy();
        const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
        fireEvent.change(screen.getByLabelText(en.InvitationEditor.photos.change), { target: { files: [file] } });
        expect(onPickPhoto).toHaveBeenCalledExactlyOnceWith(file);
        fireEvent.click(screen.getByRole('button', { name: en.ImageDropInput.remove }));
        expect(onRemovePhoto).toHaveBeenCalledOnce();
    });

    it('takes another photo after one that did not upload', async () => {
        renderSheet({ kind: 'photo', failed: true });
        expect(await screen.findByText(en.InvitationEditor.photos.errors.failed)).toBeTruthy();
        expect(screen.getByLabelText(en.FeedEditor.addPhoto)).toBeTruthy();
        expect(screen.queryByRole('button', { name: en.ImageDropInput.remove })).toBeNull();
    });
});
