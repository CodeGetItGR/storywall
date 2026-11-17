'use client';

import { useQuery } from '@tanstack/react-query';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isInvitationSlug } from '@/lib/invitation/inviteHost';
import { invitationPublicationKeys, normalizeSlug, type SlugAvailabilityDto, slugCheck } from '@/lib/invitation/publication';

// Waits for a pause in typing before asking the backend.
export const SLUG_CHECK_DEBOUNCE_MS = 400;

// Whether the typed invitation link is free, checked as the host types.
export function useSlugAvailability(value: string) {
    const slug = normalizeSlug(value);
    const debounced = useDebouncedValue(slug, SLUG_CHECK_DEBOUNCE_MS);
    const query = useQuery({
        queryKey: invitationPublicationKeys.slug(debounced),
        queryFn: () => api.get<SlugAvailabilityDto>(endpoints.invitationSlugs.availability(debounced)),
        enabled: isInvitationSlug(debounced),
        staleTime: 30_000,
        retry: false,
    });
    // An answer for an older link doesn't count.
    const isCurrent = debounced === slug;

    return { slug, check: slugCheck(slug, isCurrent ? query.data : undefined, { failed: isCurrent && query.isError }) };
}
