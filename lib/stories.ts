import type { StoryResponseDto } from '@/lib/api/types';

export interface StoryGroup {
    authorMemberId: string;
    // Sorted oldest -> newest within the author's queue.
    stories: StoryResponseDto[];
    allSeen: boolean;
    latestCreatedAt: string;
}

interface GroupStoriesOptions {
    now?: Date;
    // The tray hides expired stories; the viewer keeps showing whatever it was
    // already asked to open, since expiry is documented as not
    // server-enforced removal.
    filterExpired?: boolean;
}

// Turns a flat event story list into per-author queues, ordered with
// authors who have at least one unseen story first, then by most recent
// story. Stories with no authorMemberId are dropped — there's no avatar to
// group them under.
export function groupStoriesByAuthor(
    stories: StoryResponseDto[],
    { now = new Date(), filterExpired = true }: GroupStoriesOptions = {}
): StoryGroup[] {
    const eligible = filterExpired ? stories.filter((s) => new Date(s.expiresAt) >= now) : stories;

    const byAuthor = new Map<string, StoryResponseDto[]>();
    for (const story of eligible) {
        if (!story.authorMemberId) continue;
        const list = byAuthor.get(story.authorMemberId) ?? [];
        list.push(story);
        byAuthor.set(story.authorMemberId, list);
    }

    const groups: StoryGroup[] = Array.from(byAuthor.entries()).map(([authorMemberId, groupStories]) => {
        const sorted = [...groupStories].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return {
            authorMemberId,
            stories: sorted,
            allSeen: sorted.every((s) => s.viewedByCurrentUser),
            latestCreatedAt: sorted[sorted.length - 1].createdAt,
        };
    });

    groups.sort((a, b) => {
        if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
        return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime();
    });

    return groups;
}

// `groups` re-sorts live as stories get marked viewed (unseen authors float to
// the front), so looking up "the next author" by array index breaks mid-session
// once the current author's own group re-sorts out from under that index. The
// viewer instead freezes the author order once when it opens and walks that
// fixed order here, resolving each id against the live `groups` for content.
export function findAdjacentGroup(order: string[], currentAuthorId: string, groups: StoryGroup[], direction: 1 | -1): StoryGroup | null {
    const startIndex = order.indexOf(currentAuthorId);
    if (startIndex < 0) return null;

    for (let i = startIndex + direction; i >= 0 && i < order.length; i += direction) {
        const match = groups.find((g) => g.authorMemberId === order[i]);
        if (match) return match;
    }
    return null;
}
