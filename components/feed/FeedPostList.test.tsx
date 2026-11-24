import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedPostList } from '@/components/feed/FeedPostList';
import type { PartnerBrandingDto, PostResponseDto } from '@/lib/api/types';
import { withPartnerCards } from '@/lib/feed/partnerBranding';

vi.mock('@/components/feed/PostCard', () => ({
    PostCard: ({ isFirst, endsPage }: { isFirst?: boolean; endsPage?: boolean }) => (
        <article>{`${isFirst ? 'first ' : ''}post${endsPage ? ' end' : ''}`}</article>
    ),
}));
vi.mock('@/components/feed/PlaylistDigestCard', () => ({ PlaylistDigestCard: () => <article>digest</article> }));
vi.mock('@/components/feed/partner/PartnerFeedCard', () => ({ PartnerFeedCard: () => <article>partner</article> }));

const post = (id: string) => ({ id, type: 'TEXT', author: { memberId: 'm1' } }) as PostResponseDto;
const digest = { id: 'digest', type: 'PLAYLIST', author: null } as PostResponseDto;
const branding = { placement: { firstAfter: 2, every: 25 } } as PartnerBrandingDto;

const list = (posts: PostResponseDto[], partner: PartnerBrandingDto | null = null, endsWithPost = false) => (
    <FeedPostList items={withPartnerCards(posts, partner?.placement ?? null)} partnerBranding={partner} eventId="e1" endsWithPost={endsWithPost} />
);
const drawn = () => screen.getAllByRole('article').map((card) => card.textContent);

describe('FeedPostList', () => {
    afterEach(cleanup);

    it('marks only the first post', () => {
        render(list([post('a'), post('b'), post('c'), digest, post('d')], branding));
        expect(drawn()).toEqual(['first post', 'post', 'partner', 'post', 'digest', 'post']);
    });

    it('marks no post when another card comes first', () => {
        render(list([digest, post('a')]));
        expect(drawn()).toEqual(['digest', 'post']);
    });

    it('keeps the mark on the first post when more load', () => {
        const { rerender } = render(list([post('a')]));
        rerender(list([post('a'), post('b')]));
        expect(drawn()).toEqual(['first post', 'post']);
    });

    it('tells only the last post that it ends the page', () => {
        render(list([post('a'), post('b')], null, true));
        expect(drawn()).toEqual(['first post', 'post end']);
    });
});
