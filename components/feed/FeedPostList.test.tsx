import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedPostList } from '@/components/feed/FeedPostList';
import type { PartnerBrandingDto, PostResponseDto } from '@/lib/api/types';

vi.mock('@/components/feed/PostCard', () => ({
    PostCard: ({ startsRun, endsRun }: { startsRun?: boolean; endsRun?: boolean }) => (
        <article>{`post${startsRun ? ' start' : ''}${endsRun ? ' end' : ''}`}</article>
    ),
}));
vi.mock('@/components/feed/PlaylistDigestCard', () => ({ PlaylistDigestCard: () => <article>digest</article> }));
vi.mock('@/components/feed/partner/PartnerFeedCard', () => ({ PartnerFeedCard: () => <article>partner</article> }));

const post = (id: string) => ({ id, type: 'TEXT', author: { memberId: 'm1' } }) as PostResponseDto;
const digest = { id: 'digest', type: 'PLAYLIST', author: null } as PostResponseDto;
const branding = { placement: { firstAfter: 2, every: 25 } } as PartnerBrandingDto;

const list = (posts: PostResponseDto[], partner: PartnerBrandingDto | null = null) => (
    <FeedPostList posts={posts} partnerBranding={partner} eventId="e1" />
);
const drawn = () => screen.getAllByRole('article').map((card) => card.textContent);

describe('FeedPostList', () => {
    afterEach(cleanup);

    it('ends a run at each card that is not a post', () => {
        render(list([post('a'), post('b'), post('c'), digest, post('d')], branding));
        expect(drawn()).toEqual(['post start', 'post end', 'partner', 'post start end', 'digest', 'post start end']);
    });

    it('joins the last post to the ones that load after it', () => {
        const { rerender } = render(list([post('a'), post('b')]));
        expect(drawn()).toEqual(['post start', 'post end']);
        rerender(list([post('a'), post('b'), post('c')]));
        expect(drawn()).toEqual(['post start', 'post', 'post end']);
    });
});
