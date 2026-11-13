'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { readSampleSections, type SampleSections } from '@/lib/invitation/eventLinks';
import { invitationThemeKeys, type ThemeSamples } from '@/lib/invitation/themeCatalogue';
import { invitationThemeEndpoint, type InvitationThemePublicDto } from '@/lib/invitation/themePreview';

type ThemeSampleContent = { sections: SampleSections; imageUrls: Readonly<Record<string, string>> };

function readThemeSamples(samples: ThemeSamples): ThemeSampleContent {
    return { sections: readSampleSections(samples), imageUrls: samples.assetUrls ?? {} };
}

// The draft's theme as the catalogue sends it: its sections hold the sample content a new draft starts with, and
// their image URLs draw a sample photo put back in place. The cache keeps the theme's document as sent (the editor
// page prefetches it). Null until it loads, and when the theme isn't in the catalogue or its document can't be read;
// then nothing new starts following the event.
export function useThemeSampleSections(themeSlug: string | null): ThemeSampleContent | null {
    const { data } = useQuery({
        queryKey: invitationThemeKeys.samples(themeSlug ?? ''),
        queryFn: async (): Promise<ThemeSamples> => {
            const theme = await api.get<InvitationThemePublicDto>(invitationThemeEndpoint(themeSlug!));
            return { document: theme.document, assetUrls: theme.assetUrls };
        },
        select: readThemeSamples,
        enabled: Boolean(themeSlug),
        staleTime: Infinity,
        retry: false,
    });
    return data ?? null;
}
