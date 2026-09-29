import type {
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

// Swaps presigned URLs by media id everywhere a media record is embedded. Everything else the
// visitor changed is kept.
export function swapMediaUrls(db: DemoDb, freshMedia: MediaResponseDto[]): void {
    const fresh = new Map(freshMedia.map((m) => [m.id, m]));

    for (const media of db.list('media')) {
        if (fresh.has(media.id)) db.update('media', media.id, (m) => withFreshUrls(m, fresh));
    }
    for (const post of db.list('posts')) {
        if (post.media.some((m) => fresh.has(m.id))) {
            db.update('posts', post.id, (p) => ({ ...p, media: p.media.map((m) => withFreshUrls(m, fresh)) }));
        }
    }
    for (const event of db.list('events')) {
        if (event.coverMedia && fresh.has(event.coverMedia.id)) {
            db.update('events', event.id, (e) => ({ ...e, coverMedia: e.coverMedia && withFreshUrls(e.coverMedia, fresh) }));
        }
    }
}
