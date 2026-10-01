import type {
    AuthorDto,
    CommentResponseDto,
    DemoSnapshotDto,
    EventDetailResponseDto,
    EventGiftAccountResponseDto,
    EventInvitationResponseDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    EventSessionResponseDto,
    MediaResponseDto,
    PlaylistSuggestionResponseDto,
    PostResponseDto,
    QrLinkResponseDto,
    ReactionResponseDto,
    RsvpResponseDto,
    StoryResponseDto,
    WishbookEntryResponseDto,
} from '@/lib/api/types';
import { createMockDb, type MockDb } from '@/lib/demo/mockDb';

export type DemoSchema = {
    events: EventDetailResponseDto[];
    posts: PostResponseDto[];
    comments: CommentResponseDto[];
    reactions: ReactionResponseDto[];
    media: MediaResponseDto[];
    members: EventMemberResponseDto[];
    modules: EventModuleResponseDto[];
    sessions: EventSessionResponseDto[];
    rsvps: RsvpResponseDto[];
    stories: StoryResponseDto[];
    wishbook: WishbookEntryResponseDto[];
    invitations: EventInvitationResponseDto[];
    qrLinks: QrLinkResponseDto[];
    playlistSuggestions: PlaylistSuggestionResponseDto[];
    giftAccounts: EventGiftAccountResponseDto[];
};

export type DemoDb = MockDb<{ [K in keyof DemoSchema]: DemoSchema[K][number] }>;

export function demoStorageKey(eventTypeKey: string): string {
    return `storywall:demo:v2:${eventTypeKey}`;
}

// `snapshot` must already be rebased (see snapshotRebase.ts).
export function seedDemoSchema(snapshot: DemoSnapshotDto): DemoSchema {
    return {
        events: [snapshot.event],
        posts: snapshot.posts,
        comments: snapshot.comments,
        reactions: snapshot.reactions,
        media: snapshot.media,
        members: snapshot.members,
        modules: snapshot.event.modules,
        sessions: snapshot.event.sessions ?? [],
        rsvps: snapshot.rsvps,
        stories: snapshot.stories,
        wishbook: snapshot.wishbookEntries,
        invitations: [],
        qrLinks: snapshot.qrLinks,
        playlistSuggestions: snapshot.playlistSuggestions,
        giftAccounts: snapshot.giftAccount ? [snapshot.giftAccount] : [],
    };
}

// Media the visitor adds is only an object URL, which dies with the page — drop it (and
// whatever shows it) when restoring a saved demo, instead of rendering broken images.
export function isLocalMedia(media: Pick<MediaResponseDto, 'mediaUrl'>): boolean {
    return media.mediaUrl.startsWith('blob:');
}

// Everything a visitor adds gets a `demo-` id (mockHandlers' newId); the snapshot's ids never do.
export function isLocalDemoContentId(id: string): boolean {
    return id.startsWith('demo-');
}

export function dropLocalMedia(state: DemoSchema): DemoSchema {
    const localIds = new Set(state.media.filter(isLocalMedia).map((m) => m.id));
    if (localIds.size === 0) return state;

    return {
        ...state,
        media: state.media.filter((m) => !localIds.has(m.id)),
        posts: state.posts.map((post) => ({ ...post, media: post.media.filter((m) => !localIds.has(m.id)) })),
        stories: state.stories.filter((story) => !localIds.has(story.mediaId)),
    };
}

export function createDemoDb(eventTypeKey: string, snapshot: DemoSnapshotDto): DemoDb {
    return createMockDb<DemoSchema>(demoStorageKey(eventTypeKey), () => seedDemoSchema(snapshot), dropLocalMedia);
}

function withFreshUrls(media: MediaResponseDto, fresh: Map<string, MediaResponseDto>): MediaResponseDto {
    const next = fresh.get(media.id);
    return next ? { ...media, mediaUrl: next.mediaUrl, thumbnailUrl: next.thumbnailUrl } : media;
}

function withFreshAvatar<T extends { author: AuthorDto | null }>(item: T, avatars: Map<string, string | null>): T {
    const author = item.author;
    if (!author || !avatars.has(author.memberId)) return item;
    return { ...item, author: { ...author, avatarUrl: avatars.get(author.memberId) ?? null } };
}

function hasStaleAvatar(item: { author: AuthorDto | null }, avatars: Map<string, string | null>): boolean {
    return Boolean(item.author && avatars.has(item.author.memberId));
}

// Swaps presigned URLs everywhere they are embedded: media by media id, and persona pictures
// (members' avatarUrl and every author's) by member id. Everything else the visitor changed is kept.
export function swapMediaUrls(db: DemoDb, fresh: Pick<DemoSnapshotDto, 'media' | 'members'>): void {
    const freshMedia = new Map(fresh.media.map((m) => [m.id, m]));
    const avatars = new Map(fresh.members.map((member) => [member.id, member.avatarUrl]));

    for (const media of db.list('media')) {
        if (freshMedia.has(media.id)) db.update('media', media.id, (m) => withFreshUrls(m, freshMedia));
    }
    for (const post of db.list('posts')) {
        const staleMedia = post.media.some((m) => freshMedia.has(m.id));
        const staleAvatar = hasStaleAvatar(post, avatars) || post.recentComments.some((c) => hasStaleAvatar(c, avatars));
        if (staleMedia || staleAvatar) {
            db.update('posts', post.id, (p) => ({
                ...withFreshAvatar(p, avatars),
                media: p.media.map((m) => withFreshUrls(m, freshMedia)),
                recentComments: p.recentComments.map((c) => withFreshAvatar(c, avatars)),
            }));
        }
    }
    for (const event of db.list('events')) {
        if (event.coverMedia && freshMedia.has(event.coverMedia.id)) {
            db.update('events', event.id, (e) => ({ ...e, coverMedia: e.coverMedia && withFreshUrls(e.coverMedia, freshMedia) }));
        }
    }
    for (const member of db.list('members')) {
        if (avatars.has(member.id)) db.update('members', member.id, (m) => ({ ...m, avatarUrl: avatars.get(m.id) ?? null }));
    }
    for (const comment of db.list('comments')) {
        if (hasStaleAvatar(comment, avatars)) db.update('comments', comment.id, (c) => withFreshAvatar(c, avatars));
    }
    for (const story of db.list('stories')) {
        if (hasStaleAvatar(story, avatars)) db.update('stories', story.id, (st) => withFreshAvatar(st, avatars));
    }
}
