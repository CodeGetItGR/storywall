import { beforeEach, describe, expect, it, vi } from 'vitest';

import { routes } from '@/lib/routes';

const mocks = vi.hoisted(() => ({
    redirect: vi.fn(),
    redirectAccessToken: vi.fn(),
    serverGet: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/auth/serverEventContext', () => ({ redirectAccessToken: mocks.redirectAccessToken }));
vi.mock('@/lib/api/serverFetch', () => ({ serverGet: mocks.serverGet }));
vi.mock('./PageClient', () => ({ default: () => null }));

import Page from './page';
import PostRedirectPage from './PageClient';

function visit() {
    return Page({ params: Promise.resolve({ id: 'post-1' }) });
}

describe('single post link', () => {
    beforeEach(() => {
        mocks.redirect.mockReset();
        mocks.redirectAccessToken.mockReset().mockResolvedValue('token-1');
        mocks.serverGet.mockReset();
    });

    it("opens the post in its event's feed", async () => {
        mocks.serverGet.mockResolvedValue({ id: 'post-1', eventId: 'event-1' });

        await visit();

        expect(mocks.serverGet).toHaveBeenCalledWith('/api/posts/post-1', 'token-1');
        expect(mocks.redirect).toHaveBeenCalledWith(routes.events.feed('event-1', { post: 'post-1' }));
    });

    it("leaves it to the browser when the server can't load the post", async () => {
        mocks.serverGet.mockRejectedValue(new Error('Server prefetch failed for /api/posts/post-1 with status 404'));

        const element = await visit();

        expect(mocks.redirect).not.toHaveBeenCalled();
        expect(element).toMatchObject({ type: PostRedirectPage, props: { id: 'post-1' } });
    });

    it('leaves it to the browser without a session', async () => {
        mocks.redirectAccessToken.mockResolvedValue(null);

        const element = await visit();

        expect(mocks.serverGet).not.toHaveBeenCalled();
        expect(element).toMatchObject({ type: PostRedirectPage, props: { id: 'post-1' } });
    });
});
