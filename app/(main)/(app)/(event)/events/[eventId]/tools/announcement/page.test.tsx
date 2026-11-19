import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url) }));

import Page from './page';

describe('Announcement page', () => {
    it('sends old links to the feed composer in Announcement mode', async () => {
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        expect(redirect).toHaveBeenCalledWith('/events/e1/feed?compose=announcement');
    });
});
