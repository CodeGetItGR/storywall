'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import {
    CATALOGUE_EVENT_TYPES,
    type InvitationThemeCardDto,
    invitationThemeKeys,
    invitationThemesEndpoint,
    mergeCatalogue,
} from '@/lib/invitation/themeCatalogue';

async function fetchCatalogue(): Promise<InvitationThemeCardDto[]> {
    const lists = await Promise.all(CATALOGUE_EVENT_TYPES.map((eventType) => api.get<InvitationThemeCardDto[]>(invitationThemesEndpoint(eventType))));
    return mergeCatalogue(lists);
}

// Every active theme the catalogue lists. A full page load finds them already in the cache (the page
// prefetches them on the server).
export function useInvitationThemeCatalogue() {
    const { data, isPending, isError, refetch } = useQuery({ queryKey: invitationThemeKeys.catalogue(), queryFn: fetchCatalogue });
    return { themes: data ?? null, isPending, isError, retry: refetch };
}
