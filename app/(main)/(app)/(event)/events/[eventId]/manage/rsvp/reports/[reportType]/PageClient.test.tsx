import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import RsvpReportPage from './PageClient';

const mocks = vi.hoisted(() => ({
    notFound: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useParams: () => ({ reportType: 'BOGUS' }),
    notFound: mocks.notFound,
}));

vi.mock('@/components/manage/rsvp/RsvpReportScreen', () => ({
    RsvpReportScreen: () => null,
}));

vi.mock('@/components/routing/EventRouteGate', () => ({
    EventRouteGate: ({ children }: { children: React.ReactNode }) => children,
}));

describe('RsvpReportPage (PageClient)', () => {
    afterEach(cleanup);

    it('404s on an invalid report type', () => {
        render(<RsvpReportPage />);

        expect(mocks.notFound).toHaveBeenCalledOnce();
    });
});
