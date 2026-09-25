import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    notFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));

vi.mock('next/navigation', () => ({
    notFound: mocks.notFound,
}));

import Page from './page';

describe('RsvpReportPage (server)', () => {
    it('404s on an invalid report type before resolving the event context', async () => {
        await expect(Page({ params: Promise.resolve({ eventId: 'e1', reportType: 'BOGUS' }) })).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mocks.notFound).toHaveBeenCalledOnce();
    });
});
