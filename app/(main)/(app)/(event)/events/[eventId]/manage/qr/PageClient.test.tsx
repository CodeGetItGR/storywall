import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import InvitationsQrPage from './PageClient';

vi.mock('@/components/manage/invitations/InvitationsQrScreen', () => ({ InvitationsQrScreen: () => null }));
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

describe('InvitationsQrPage (PageClient)', () => {
    it('opens to planners with the QR read capability', () => {
        const { container } = render(<InvitationsQrPage />);

        expect(container.firstElementChild?.getAttribute('data-capability')).toBe('QR_READ');
        expect(container.firstElementChild?.getAttribute('data-host')).toBe('true');
    });
});
