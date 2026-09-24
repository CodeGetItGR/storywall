import { beforeEach, describe, expect, it, vi } from 'vitest';

import Page from './page';

const mocks = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

function visit(searchParams: { extend?: string }) {
    return Page({ params: Promise.resolve({ eventId: 'event-1' }), searchParams: Promise.resolve(searchParams) });
}

describe('plan settings redirect', () => {
    beforeEach(() => mocks.redirect.mockReset());

    it('opens the extension section for ?extend=1', async () => {
        await visit({ extend: '1' });
        expect(mocks.redirect).toHaveBeenCalledWith('/events/event-1/manage?tab=billing&section=extend-coverage');
    });

    it('lands on billing otherwise', async () => {
        await visit({});
        expect(mocks.redirect).toHaveBeenCalledWith('/events/event-1/manage?tab=billing');
    });
});
