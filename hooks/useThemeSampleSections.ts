'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { readSampleSections, type SampleSections } from '@/lib/invitation/eventLinks';
import { invitationThemeKeys } from '@/lib/invitation/themeCatalogue';
import { invitationThemeEndpoint, type InvitationThemePublicDto } from '@/lib/invitation/themePreview';

type ThemeSampleContent = { sections: SampleSections; imageUrls: Readonly<Record<string, string>> };

function readThemeSamples(theme: InvitationThemePublicDto): ThemeSampleContent {
    return { sections: readSampleSections(theme), imageUrls: theme.assetUrls ?? {} };
}

// The invitation's theme as the catalogue sends it (the same read as the theme switch's, which the editor page
// prefetches): its sections hold the sample content a new draft starts with, and their image URLs draw a sample photo
// put back in place. Null until it loads, and when the theme isn't in the catalogue or its document can't be read;
// then nothing new starts following the event.
export function useThemeSampleSections(themeSlug: string | null): ThemeSampleContent | null {
    const { data } = useQuery({
        queryKey: invitationThemeKeys.publicTheme(themeSlug ?? ''),
        queryFn: () => api.get<InvitationThemePublicDto>(invitationThemeEndpoint(themeSlug!)),
        select: readThemeSamples,
        enabled: Boolean(themeSlug),
        staleTime: Infinity,
        retry: false,
    });
    return data ?? null;
}
