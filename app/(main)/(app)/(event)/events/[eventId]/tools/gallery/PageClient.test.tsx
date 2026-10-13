import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ activeEvent: null as Record<string, unknown> | null }));

vi.mock('@/providers/EventProvider', () => ({ useActiveEvent: () => mocks.activeEvent }));
vi.mock('@/components/gallery/GalleryScreen', () => ({ GalleryScreen: () => null }));
vi.mock('@/components/gallery/GallerySkeletons', () => ({ GalleryPageSkeleton: () => null }));
vi.mock('@/components/routing/EventRouteGate', () => ({
    EventRouteGate: ({ requireHost, children }: { requireHost?: boolean; children: ReactNode }) => (
        <div data-testid="gate" data-require-host={String(Boolean(requireHost))}>
            {children}
        </div>
    ),
}));

import GalleryPage from './PageClient';

function gallery(configuration: Record<string, unknown>) {
    return { id: 'e1', deletedAt: null, modules: [{ moduleKey: 'gallery', isAvailable: true, isEnabled: true, configuration }] };
}

function requiresHost() {
    render(<GalleryPage />);
    return screen.getByTestId('gate').dataset.requireHost;
}

describe('GalleryPage gate', () => {
    afterEach(() => {
        cleanup();
        mocks.activeEvent = null;
    });

    it('lets guests in where members get the download', () => {
        mocks.activeEvent = gallery({ memberArchiveAfterEnd: true });
        expect(requiresHost()).toBe('false');
    });

    it('stays host-only otherwise', () => {
        mocks.activeEvent = gallery({ qrUploadEnabled: true });
        expect(requiresHost()).toBe('true');
    });

    it('stays host-only while the event loads', () => {
        expect(requiresHost()).toBe('true');
    });
});
