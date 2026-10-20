import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RsvpReportPage from './PageClient';

const mocks = vi.hoisted(() => ({
    notFound: vi.fn(),
    useParams: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useParams: mocks.useParams,
    notFound: mocks.notFound,
}));

vi.mock('@/components/manage/rsvp/RsvpReportScreen', () => ({
    RsvpReportScreen: () => null,
}));

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

describe('RsvpReportPage (PageClient)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(cleanup);

    it('404s on an invalid report type', () => {
        mocks.useParams.mockReturnValue({ reportType: 'BOGUS' });

        render(<RsvpReportPage />);

        expect(mocks.notFound).toHaveBeenCalledOnce();
    });

    it('renders for a valid report type without 404ing', () => {
        mocks.useParams.mockReturnValue({ reportType: 'FULL_LIST' });

        render(<RsvpReportPage />);

        expect(mocks.notFound).not.toHaveBeenCalled();
    });

    it('opens to planners with the RSVP report capability', () => {
        mocks.useParams.mockReturnValue({ reportType: 'FULL_LIST' });

        const { container } = render(<RsvpReportPage />);

        expect(container.firstElementChild?.getAttribute('data-capability')).toBe('RSVP_REPORT');
        expect(container.firstElementChild?.getAttribute('data-host')).toBe('true');
    });
});
