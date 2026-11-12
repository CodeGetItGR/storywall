'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { readSampleSections } from '@/lib/invitation/eventLinks';
import { invitationThemeKeys } from '@/lib/invitation/themeCatalogue';
import { invitationThemeEndpoint, type InvitationThemePublicDto } from '@/lib/invitation/themePreview';

function sampleSectionsOf(document: unknown) {
    return readSampleSections({ document });
}

// The draft's theme as the catalogue sends it: its sections hold the sample content a new draft starts with. The
// cache keeps the theme's document as sent (the editor page prefetches it); null until it loads, and when the theme
// isn't in the catalogue or its document can't be read; then nothing new starts following the event.
export function useThemeSampleSections(themeSlug: string | null) {
    const { data } = useQuery({
        queryKey: invitationThemeKeys.samples(themeSlug ?? ''),
        queryFn: async () => (await api.get<InvitationThemePublicDto>(invitationThemeEndpoint(themeSlug!))).document,
        select: sampleSectionsOf,
        enabled: Boolean(themeSlug),
        staleTime: Infinity,
        retry: false,
    });
    return data ?? null;
}
