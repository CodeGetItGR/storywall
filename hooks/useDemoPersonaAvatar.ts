import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { eventMemberKeys } from '@/hooks/useEventMembers';
import { storyKeys } from '@/hooks/useStories';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { postKeys } from '@/lib/postQueries';

// A persona's picture shows on the member list and on everything they authored: posts (and the
// inline comments they carry), comment threads and stories.
async function refreshPersonaViews(queryClient: QueryClient, eventId: string, updated: EventMemberResponseDto) {
    // Swap the returned member in first so the act-as bar updates at once. Cancel first so an
    // older in-flight refetch can't land on top of it.
    const membersKey = eventMemberKeys.list(eventId);
    await queryClient.cancelQueries({ queryKey: membersKey });
    queryClient.setQueryData<EventMemberResponseDto[]>(membersKey, (members) =>
        members?.map((member) => (member.id === updated.id ? updated : member)),
    );

    queryClient.invalidateQueries({ queryKey: membersKey });
    queryClient.invalidateQueries({ queryKey: postKeys.list(eventId) });
    queryClient.invalidateQueries({ queryKey: storyKeys.list(eventId) });
    // An open story's detail (['stories', storyId]) carries the author too.
    queryClient.invalidateQueries({ queryKey: ['stories'] });
    // Post details and comment threads are keyed by post (['posts', postId, ...]), not by event.
    // Deliberately broad: this is rare and admin-only, and only active queries refetch.
    queryClient.invalidateQueries({ queryKey: ['posts'] });
}

// POST /api/event-members/{id}/demo-avatar — an admin hosting a demo event, name-only guests only (5104 otherwise).
export function useSetDemoPersonaAvatar(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ memberId, file }: { memberId: string; file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            return api.postForm<EventMemberResponseDto>(endpoints.eventMembers.demoAvatar(memberId), formData);
        },
        onSuccess: (updated) => refreshPersonaViews(queryClient, eventId, updated),
    });
}

// DELETE /api/event-members/{id}/demo-avatar — clearing a guest with no picture is a no-op.
export function useClearDemoPersonaAvatar(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (memberId: string) => api.del<EventMemberResponseDto>(endpoints.eventMembers.demoAvatar(memberId)),
        onSuccess: (updated) => refreshPersonaViews(queryClient, eventId, updated),
    });
}
