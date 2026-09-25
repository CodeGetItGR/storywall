import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    notFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
    resolveServerEventContext: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    notFound: mocks.notFound,
}));

vi.mock('@/lib/auth/serverEventContext', () => ({
    resolveServerEventContext: mocks.resolveServerEventContext,
}));

// Not exercised by this test, but page.tsx imports it — stub it out so the
// test doesn't pull in real server modules (fetch, headers/cookies).
vi.mock('@/lib/api/serverFetch', () => ({
    serverGet: vi.fn(),
}));

import Page from './page';

describe('RsvpReportPage (server)', () => {
    it('404s on an invalid report type before resolving the event context', async () => {
        await expect(Page({ params: Promise.resolve({ eventId: 'e1', reportType: 'BOGUS' }) })).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mocks.notFound).toHaveBeenCalledOnce();
        expect(mocks.resolveServerEventContext).not.toHaveBeenCalled();
    });
});
