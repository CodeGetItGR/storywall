'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { adminInvitationThemeKeys } from '@/hooks/useAdminInvitationThemes';
import type { AdminInvitationThemeDto } from '@/lib/adminInvitationThemes';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { type EditableTheme, readEditableTheme } from '@/lib/invitation/themeEditing';

function themeQueryOptions(themeId: string) {
    return {
        queryKey: adminInvitationThemeKeys.detail(themeId),
        queryFn: () => api.get<AdminInvitationThemeDto>(endpoints.admin.invitationThemes.byId(themeId)),
    };
}

function editableOrInvalid(dto: AdminInvitationThemeDto | undefined): EditableTheme | 'invalid' | null {
    if (!dto) return null;
    try {
        return readEditableTheme(dto);
    } catch {
        return 'invalid';
    }
}

// The theme an admin opens in the editor. Like a host's draft (useInvitationDraft), it is
// read again on open, stays open once loaded, and reload() starts over from the stored copy.
export function useAdminThemeEditorSource(themeId: string, { prefetched = false }: { prefetched?: boolean } = {}) {
    const queryClient = useQueryClient();
    const query = useQuery({ ...themeQueryOptions(themeId), refetchOnMount: prefetched ? true : 'always', staleTime: 0 });
    const editable = useMemo(() => editableOrInvalid(query.data), [query.data]);
    const [isCurrent, setIsCurrent] = useState(prefetched);
    if (!isCurrent && query.isFetchedAfterMount && query.isSuccess) setIsCurrent(true);
    const [loadId, setLoadId] = useState(0);
    const [isReloading, setIsReloading] = useState(false);
    const { refetch } = query;

    const retry = useCallback(() => {
        void refetch();
    }, [refetch]);

    const reload = useCallback(async () => {
        setIsReloading(true);
        try {
            await queryClient.fetchQuery({ ...themeQueryOptions(themeId), staleTime: 0 });
            setLoadId((current) => current + 1);
        } catch {
            // The conflict stays open; the next try may get through.
        } finally {
            setIsReloading(false);
        }
    }, [queryClient, themeId]);

    return {
        theme: isCurrent && editable !== 'invalid' ? editable : null,
        isError: (isCurrent && editable === 'invalid') || (!isCurrent && query.isError),
        loadId,
        isReloading,
        retry,
        reload,
    };
}
