import type { InfiniteData } from '@tanstack/react-query';

import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { PostResponseDto } from '@/lib/api/types';

export const postKeys = {
    list: (eventId: string) => ['events', eventId, 'posts'] as const,
    detail: (id: string) => ['posts', id] as const,
    media: (postId: string) => ['posts', postId, 'media'] as const,
};

export const POSTS_PAGE_SIZE = 20;

export function feedPagePath(eventId: string, page: number) {
    return `${endpoints.events.posts(eventId)}?page=${page}&size=${POSTS_PAGE_SIZE}`;
}

// The feed with `first` in place of its first page, and the pages after it
// left as they were. Posts that dropped off the first page (most likely pushed
// down by new ones) move to the top of the second, so none vanish between the
// new first page and the old second one. Posts now on the first page leave the
// later pages. Totals come from `first`, so a feed that grew knows it has more
// to load.
//
// The later pages can then overlap the next page fetched, because the pages
// are offsets and the offsets moved: render them through uniqueById. A post
// deleted from a later page stays until the feed's next full refetch.
export function withFreshFirstPage(feed: InfiniteData<Page<PostResponseDto>>, first: Page<PostResponseDto>): InfiniteData<Page<PostResponseDto>> {
    const onFirst = new Set(first.content.map((post) => post.id));
    const droppedOff = feed.pages[0].content.filter((post) => !onFirst.has(post.id));
    const pages = feed.pages.map((page, index) => {
        if (index === 0) return first;
        const rest = page.content.filter((post) => !onFirst.has(post.id));
        return {
            content: index === 1 ? [...droppedOff, ...rest] : rest,
            page: { ...page.page, totalElements: first.page.totalElements, totalPages: first.page.totalPages },
        };
    });
    return { ...feed, pages };
}

// First occurrence wins, so a post keeps the place it was first shown in.
export function uniqueById<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
}
