import type { PlaylistSuggestionResponseDto } from '@/lib/api/types';

export function sortPlaylistSuggestionsBySupport(suggestions: PlaylistSuggestionResponseDto[]) {
    return [...suggestions].sort((first, second) => {
        if (second.upvoteCount !== first.upvoteCount) return second.upvoteCount - first.upvoteCount;
        if (first.downvoteCount !== second.downvoteCount) return first.downvoteCount - second.downvoteCount;

        return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
    });
}
