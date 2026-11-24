import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedPostList } from '@/components/feed/FeedPostList';
import type { PartnerBrandingDto, PostResponseDto } from '@/lib/api/types';

vi.mock('@/components/feed/PostCard', () => ({
    PostCard: ({ isFirst }: { isFirst?: boolean }) => <article>{isFirst ? 'first post' : 'post'}</article>,
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
});
