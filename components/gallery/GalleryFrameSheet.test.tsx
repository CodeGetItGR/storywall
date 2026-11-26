import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storyEvent } from '@/.storybook/fixtures';
import { GalleryFrameRow } from '@/components/gallery/GalleryFrameRow';
import { GalleryFrameSheet } from '@/components/gallery/GalleryFrameSheet';
import { useGalleryFrameSetting } from '@/hooks/useGalleryFrameSetting';
import en from '@/messages/en.json';

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock('@/hooks/useEvent', () => ({ useUpdateEvent: () => ({ mutateAsync, isPending: false }) }));

const wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
        {children}
    </NextIntlClientProvider>
);
const graduation = storyEvent({ eventType: 'GRADUATION', status: 'ACTIVE', uploadFrame: 'CLASSIC' });

afterEach(() => {
    cleanup();
    mutateAsync.mockReset();
});

function Screen({ event = graduation, isHost = true }) {
    const setting = useGalleryFrameSetting(event, isHost);
    return setting ? (
        <>
            <GalleryFrameRow setting={setting} />
            <GalleryFrameSheet setting={setting} />
        </>
    ) : null;
}

describe('Photo frame setting', () => {
    it("is only for a graduation's host", () => {
        expect(renderHook(() => useGalleryFrameSetting(graduation, false), { wrapper }).result.current).toBeNull();
        expect(renderHook(() => useGalleryFrameSetting(storyEvent({ eventType: 'BIRTHDAY' }), true), { wrapper }).result.current).toBeNull();
        expect(renderHook(() => useGalleryFrameSetting(graduation, true), { wrapper }).result.current).not.toBeNull();
    });

    it('shows the current design, and saves the one the host picks', async () => {
        mutateAsync.mockResolvedValue({});
        render(<Screen />, { wrapper });

        // The open sheet hides the page from assistive tech, so the row is read first.
        expect(screen.getByRole('button', { name: 'Photo frame Classic' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Photo frame/ }));
        expect(screen.getByRole('radio', { name: 'Classic' })).toHaveAttribute('aria-checked', 'true');
        for (const name of ['No frame', 'Laurel', 'Confetti']) expect(screen.getByRole('img', { name })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('radio', { name: 'Laurel' }));
        expect(mutateAsync).toHaveBeenCalledWith({ uploadFrame: 'LAUREL' });
    });

    it('turns the frame off with No frame', () => {
        mutateAsync.mockResolvedValue({});
        render(<Screen />, { wrapper });
        fireEvent.click(screen.getByRole('button', { name: /Photo frame/ }));
        fireEvent.click(screen.getByRole('radio', { name: 'No frame' }));
        expect(mutateAsync).toHaveBeenCalledWith({ uploadFrame: 'NONE' });
    });
});
