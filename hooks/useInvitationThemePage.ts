'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { invitationThemeKeys, type InvitationThemePage, readThemePage } from '@/lib/invitation/themeCatalogue';
import { invitationThemeEndpoint, type InvitationThemePublicDto } from '@/lib/invitation/themePreview';

// One active theme's page. A full page load finds it already in the cache (the page prefetches it on
// the server, and 404s when there is no such theme).
export function useInvitationThemePage(slug: string) {
    const { data, isPending, isError, refetch } = useQuery({
        queryKey: invitationThemeKeys.page(slug),
        queryFn: async (): Promise<InvitationThemePage> => readThemePage(await api.get<InvitationThemePublicDto>(invitationThemeEndpoint(slug))),
    });
    return { theme: data ?? null, isPending, isError, retry: refetch };
}
