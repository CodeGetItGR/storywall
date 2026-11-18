import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventDangerZone } from '@/components/manage/danger/EventDangerZone';
import messages from '@/messages/en.json';

afterEach(cleanup);

const t = messages.ManagePage.settings.dangerZone;

function renderZone(props: Partial<ComponentProps<typeof EventDangerZone>> = {}) {
    const onDownloadAllAction = vi.fn();
    const onDeleteAction = vi.fn();
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <EventDangerZone
                showGalleryDownload
                wishbook={{ href: '/events/e1/tools/wishbook', label: 'Wishbook' }}
                onDownloadAllAction={onDownloadAllAction}
                onDeleteAction={onDeleteAction}
                isSendingCode={false}
                error={null}
                {...props}
            />
        </NextIntlClientProvider>,
    );
    return { onDownloadAllAction, onDeleteAction };
}

describe('EventDangerZone', () => {
    it('says what deleting does, in three lines', () => {
        renderZone();

        expect(screen.getAllByRole('listitem')).toHaveLength(3);
        expect(screen.getByText(t.consequences.guestsLoseAccess)).toBeTruthy();
        expect(screen.getByText(t.consequences.stillAvailable)).toBeTruthy();
        expect(screen.getByText(t.consequences.cannotUndo)).toBeTruthy();
    });

    it('shows the illustration with its alt text', () => {
        renderZone();

        expect(screen.getByRole('img', { name: t.illustrationAlt })).toBeTruthy();
    });

    it('opens the gallery download and links to the wishbook', () => {
        const { onDownloadAllAction } = renderZone();

        fireEvent.click(screen.getByRole('button', { name: messages.GalleryPage.downloadGallery }));
        expect(onDownloadAllAction).toHaveBeenCalledOnce();
        expect(screen.getByRole('link', { name: 'Wishbook' }).getAttribute('href')).toBe('/events/e1/tools/wishbook');
    });

    it('leaves out downloads the plan does not have', () => {
        renderZone({ showGalleryDownload: false, wishbook: null });

        expect(screen.queryByRole('button', { name: messages.GalleryPage.downloadGallery })).toBeNull();
        expect(screen.queryByRole('link')).toBeNull();
    });

    it('starts the deletion from the button', () => {
        const { onDeleteAction } = renderZone();

        fireEvent.click(screen.getByRole('button', { name: t.delete }));
        expect(onDeleteAction).toHaveBeenCalledOnce();
    });

    it('disables the button while the code is sent and shows a send error', () => {
        renderZone({ isSendingCode: true, error: 'Too many requests.' });

        expect((screen.getByRole('button', { name: t.delete }) as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByRole('alert').textContent).toBe('Too many requests.');
    });
});
