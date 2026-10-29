import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PostResponseDto } from '@/lib/api/types';

import { PostCard } from './PostCard';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: null }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useContentAccess', () => ({ useContentAccess: () => ({ isLocked: () => false, isDemoBuilder: false }) }));
vi.mock('@/hooks/useCustomRoleReport', () => ({ useCustomRoleReport: () => false }));
vi.mock('@/hooks/useMemberAvatarUrl', () => ({ useMemberAvatarUrl: () => () => null }));
vi.mock('@/hooks/usePostModal', () => ({ openPostModal: vi.fn() }));
vi.mock('@/hooks/usePosts', () => ({
    useDeletePost: () => ({ isPending: false, mutateAsync: vi.fn() }),
    useUpdatePost: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ status: 'ACTIVE', eventType: 'WEDDING' }),
    useActiveMember: () => null,
    useIsHost: () => false,
}));
vi.mock('@/components/feed/post/PostReactionPicker', () => ({ PostReactionPicker: () => null }));
vi.mock('@/components/memberRoles/AuthorRoleChip', () => ({ AuthorRoleChip: () => null }));

function post(type: PostResponseDto['type']): PostResponseDto {
    return {
        id: 'p1',
        eventId: 'e1',
        type,
        content: 'The ceremony starts at 18:00.',
        isPinned: false,
        createdAt: new Date().toISOString(),
        authorMemberId: 'm1',
        author: { memberId: 'm1', displayName: 'Maria', role: 'MEMBER' },
        media: [],
        reactionCount: 0,
        reactionCounts: {},
        commentCount: 0,
        recentComments: [],
    } as unknown as PostResponseDto;
}

describe('PostCard announcement', () => {
    afterEach(cleanup);

    it('labels an announcement', () => {
        render(<PostCard post={post('ANNOUNCEMENT')} />);
        expect(screen.getByText('announcement')).toBeTruthy();
    });

    it('leaves a normal post unlabelled', () => {
        render(<PostCard post={post('TEXT')} />);
        expect(screen.queryByText('announcement')).toBeNull();
    });

    it('labels a sneak peek', () => {
        render(<PostCard post={{ ...post('SNEAK_PEEK'), isPinned: true }} />);
        expect(screen.getByText('sneakPeek')).toBeTruthy();
        expect(screen.queryByText('announcement')).toBeNull();
    });
});
