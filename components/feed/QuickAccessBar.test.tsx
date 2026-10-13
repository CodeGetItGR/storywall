import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QuickAccessBar } from './QuickAccessBar';

const mocks = vi.hoisted(() => ({ isHost: false, activeEvent: null as Record<string, unknown> | null }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useGiftAccount', () => ({ useGiftAccount: () => ({ data: null }) }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (moduleKey: string) => ({ name: moduleKey }) }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => mocks.activeEvent,
    useIsHost: () => mocks.isHost,
    useContentAccessMode: () => 'standard',
}));

function event(galleryConfiguration: Record<string, unknown>) {
    return {
        id: 'e1',
        deletedAt: null,
        modules: [
            { moduleKey: 'gallery', isAvailable: true, isEnabled: true, configuration: galleryConfiguration },
            { moduleKey: 'playlist', isAvailable: true, isEnabled: true, configuration: {} },
        ],
    };
}

const galleryLink = () => screen.queryByRole('link', { name: /gallery/ });

describe('QuickAccessBar gallery shortcut', () => {
    afterEach(() => {
        cleanup();
        mocks.isHost = false;
    });

    it('is shown to a host', () => {
        mocks.isHost = true;
        mocks.activeEvent = event({});
        render(<QuickAccessBar />);
        expect(galleryLink()?.getAttribute('href')).toBe('/events/e1/tools/gallery');
    });

    it('is shown to a guest where members get the download', () => {
        mocks.activeEvent = event({ memberArchiveAfterEnd: true });
        render(<QuickAccessBar />);
        expect(galleryLink()?.getAttribute('href')).toBe('/events/e1/tools/gallery');
    });

    it('is hidden from a guest otherwise', () => {
        mocks.activeEvent = event({ qrUploadEnabled: true });
        render(<QuickAccessBar />);
        expect(galleryLink()).toBeNull();
    });
});
