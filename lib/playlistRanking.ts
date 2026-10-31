import type { PlaylistSuggestionResponseDto } from '@/lib/api/types';

export const PLAYLIST_TOP_RANK_COUNT = 3;

export function hasPlaylistUpvotes(suggestions: PlaylistSuggestionResponseDto[]) {
    return suggestions.some((suggestion) => suggestion.upvoteCount > 0);
}

export function shouldShowPlaylistTopRanks(suggestions: PlaylistSuggestionResponseDto[]) {
    return suggestions.length > PLAYLIST_TOP_RANK_COUNT && hasPlaylistUpvotes(suggestions);
}

export function sortPlaylistSuggestionsBySupport(suggestions: PlaylistSuggestionResponseDto[]) {
    if (!hasPlaylistUpvotes(suggestions)) {
        return [...suggestions];
    }

    return [...suggestions].sort((first, second) => {
        if (second.upvoteCount !== first.upvoteCount) return second.upvoteCount - first.upvoteCount;
        if (first.downvoteCount !== second.downvoteCount) return first.downvoteCount - second.downvoteCount;

        return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
    });
}

// The DJ's live list in two parts: what's still to play in the server's rank order, then what was played, the most
// recent first.
export function splitPlaylistLiveRows<T extends { playedAt?: string | null }>(rows: T[]) {
    const upNext = rows.filter((row) => !row.playedAt);
    const played = rows
        .filter((row) => row.playedAt)
        .sort((first, second) => new Date(second.playedAt!).getTime() - new Date(first.playedAt!).getTime());

    return { upNext, played };
}
