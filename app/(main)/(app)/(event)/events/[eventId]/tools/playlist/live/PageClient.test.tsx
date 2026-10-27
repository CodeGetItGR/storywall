import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PlaylistLivePage from './PageClient';

vi.mock('@/components/playlist/live/PlaylistLiveScreen', () => ({ PlaylistLiveScreen: () => null }));
vi.mock('@/components/routing/EventRouteGate', () => ({
    EventRouteGate: ({
        allowVendorCapability,
        requireHost,
        children,
    }: {
        allowVendorCapability?: string;
        requireHost?: boolean;
        children: React.ReactNode;
    }) => (
        <div data-capability={allowVendorCapability} data-host={String(requireHost)}>
            {children}
        </div>
    ),
}));

afterEach(cleanup);

describe('PlaylistLivePage (PageClient)', () => {
    it('opens to hosts and DJs with the song requests capability', () => {
        const { container } = render(<PlaylistLivePage />);

        expect(container.firstElementChild?.getAttribute('data-capability')).toBe('SONG_REQUESTS');
        expect(container.firstElementChild?.getAttribute('data-host')).toBe('true');
    });
});
