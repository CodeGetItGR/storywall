import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { eventKeys } from '@/hooks/useEvent';
import { eventMemberKeys } from '@/hooks/useEventMembers';
import { memberRoleOptionKeys } from '@/hooks/useMemberRoleOptions';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { storyKeys } from '@/hooks/useStories';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventMemberResponseDto, MemberRoleRequestDto } from '@/lib/api/types';
import { roleErrorKind, type RoleValue, roleValueFromRequest, withAuthorRole, withMemberRole } from '@/lib/memberRoles';
import { postKeys } from '@/lib/postQueries';

const NO_ROLE: RoleValue = { roleKey: null, customRole: null };

// PUT/DELETE …/role answer 204 with no body and don't bump the feed ETag, so
// every cached copy of the member is patched here (guide §8). Comment lists
// and post details sit under ['posts', …]; story details under ['stories', …].
function patchMemberRoleCaches(queryClient: QueryClient, eventId: string, memberId: string, role: RoleValue) {
    const patchAuthors = (data: unknown) => withAuthorRole(data, memberId, role);
    queryClient.setQueriesData({ queryKey: ['posts'] }, patchAuthors);
    queryClient.setQueriesData({ queryKey: ['stories'] }, patchAuthors);
    queryClient.setQueryData(postKeys.list(eventId), patchAuthors);
    queryClient.setQueryData(storyKeys.list(eventId), patchAuthors);

    const patchMembers = (members: EventMemberResponseDto[] | undefined) => members && withMemberRole(members, memberId, role);
    queryClient.setQueryData(eventMemberKeys.list(eventId), patchMembers);
    queryClient.setQueryData(myEventsKeys.all, patchMembers);
    queryClient.setQueryData<EventMemberResponseDto>(eventMemberKeys.detail(memberId), (member) => member && withMemberRole([member], memberId, role)[0]);

    queryClient.invalidateQueries({ queryKey: memberRoleOptionKeys.list(eventId) });
}

function refreshAfterRoleError(queryClient: QueryClient, eventId: string, error: unknown) {
    const kind = roleErrorKind(error);
    if (kind === 'stale' || kind === 'full' || kind === 'moduleOff') {
        queryClient.invalidateQueries({ queryKey: memberRoleOptionKeys.list(eventId) });
    }
    if (kind === 'moduleOff') queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
}

// PUT /api/event-members/{id}/role — the member themselves, or a host.
export function useSetMemberRole(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ memberId, request }: { memberId: string; request: MemberRoleRequestDto }) =>
            api.put<void>(endpoints.eventMembers.role(memberId), request),
        onSuccess: (_data, { memberId, request }) => patchMemberRoleCaches(queryClient, eventId, memberId, roleValueFromRequest(request)),
        onError: (error) => refreshAfterRoleError(queryClient, eventId, error),
    });
}

// DELETE /api/event-members/{id}/role — the member themselves, or a host.
export function useClearMemberRole(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (memberId: string) => api.del<void>(endpoints.eventMembers.role(memberId)),
        onSuccess: (_data, memberId) => patchMemberRoleCaches(queryClient, eventId, memberId, NO_ROLE),
        onError: (error) => refreshAfterRoleError(queryClient, eventId, error),
    });
}

// DELETE /api/event-members/{id}/role-lock — host or co-host only.
export function useUnlockMemberRole() {
    return useMutation({
        mutationFn: (memberId: string) => api.del<void>(endpoints.eventMembers.roleLock(memberId)),
    });
}
