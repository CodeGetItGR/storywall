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
const viewer = vi.hoisted(() => ({ member: null as { id: string } | null, isHost: false }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ status: 'ACTIVE', eventType: 'WEDDING' }),
    useActiveMember: () => viewer.member,
    useIsHost: () => viewer.isHost,
}));
vi.mock('@/components/feed/post/PostActionsMenu', () => ({
    PostActionsMenu: ({ editLabel, deleteLabel }: { editLabel?: string; deleteLabel?: string }) => (
        <div>
            {editLabel && <span>{editLabel}</span>}
            {deleteLabel && <span>{deleteLabel}</span>}
        </div>
    ),
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
    afterEach(() => {
        cleanup();
        viewer.member = null;
        viewer.isHost = false;
    });

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

describe('PostCard sneak peek actions', () => {
    afterEach(() => {
        cleanup();
        viewer.member = null;
        viewer.isHost = false;
    });

    it('lets its vendor neither edit nor delete it in the feed', () => {
        viewer.member = { id: 'm1' };
        render(<PostCard post={post('SNEAK_PEEK')} />);
        expect(screen.queryByText('editPost')).toBeNull();
        expect(screen.queryByText('deletePost')).toBeNull();
    });

    it('lets a host remove it but not edit it', () => {
        viewer.member = { id: 'h1' };
        viewer.isHost = true;
        render(<PostCard post={post('SNEAK_PEEK')} />);
        expect(screen.queryByText('editPost')).toBeNull();
        expect(screen.getByText('deletePost')).toBeTruthy();
    });

    it('still lets an author edit and delete a normal post', () => {
        viewer.member = { id: 'm1' };
        render(<PostCard post={post('TEXT')} />);
        expect(screen.getByText('editPost')).toBeTruthy();
        expect(screen.getByText('deletePost')).toBeTruthy();
    });
});

describe('PostCard run ends', () => {
    afterEach(cleanup);

    const classes = (props: { startsRun?: boolean; endsRun?: boolean }) => {
        render(<PostCard post={post('TEXT')} {...props} />);
        return screen.getByRole('article').className.split(' ');
    };

    it('is square by default', () => {
        expect(classes({}).some((name) => name.startsWith('rounded'))).toBe(false);
    });

    it('rounds the top of the first post only', () => {
        const names = classes({ startsRun: true });
        expect(names).toContain('rounded-t-xl');
        expect(names).not.toContain('rounded-b-xl');
    });

    it('rounds the bottom of the last post only', () => {
        const names = classes({ endsRun: true });
        expect(names).toContain('rounded-b-xl');
        expect(names).not.toContain('rounded-t-xl');
    });

    it('rounds all four corners of a lone post', () => {
        expect(classes({ startsRun: true, endsRun: true })).toEqual(expect.arrayContaining(['rounded-t-xl', 'rounded-b-xl']));
    });

    it('never clips, so menus and reactions can hang over the edge', () => {
        expect(classes({ startsRun: true, endsRun: true }).some((name) => name.startsWith('overflow'))).toBe(false);
    });
});
