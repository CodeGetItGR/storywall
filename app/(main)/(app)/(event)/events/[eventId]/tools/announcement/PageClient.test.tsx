import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AnnouncementPage from './PageClient';

vi.mock('@/components/announcement/AnnouncementScreen', () => ({ AnnouncementScreen: () => null }));
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

describe('AnnouncementPage (PageClient)', () => {
    it('opens to planners with the announce capability', () => {
        const { container } = render(<AnnouncementPage />);

        expect(container.firstElementChild?.getAttribute('data-capability')).toBe('ANNOUNCE');
        expect(container.firstElementChild?.getAttribute('data-host')).toBe('true');
    });
});
