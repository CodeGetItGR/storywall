'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { RosterEntry } from '@/lib/rsvpGuests';
import type { RsvpDisplayStatus } from '@/lib/statusTones';

export type RsvpListRow = {
    entry: RosterEntry;
    id: string;
    name: string;
    status: RsvpDisplayStatus;
    partyLabel: string;
    notes: string | null;
    // A reply-only guest's phone and email, the only way to reach them.
    contact: string | null;
    possibleDuplicate: boolean;
};

// What each row of the RSVP list shows.
export function useRsvpListRows(entries: RosterEntry[]): RsvpListRow[] {
    const t = useTranslations('ManagePage');

    return useMemo(
        () =>
            entries.map((entry) => {
                const { rsvp } = entry;
                const adultCount = rsvp?.adultCount ?? 0;
                const childCount = rsvp?.childCount ?? 0;
                const partyParts = [
                    adultCount > 0 ? t('rsvpPartyAdults', { count: adultCount }) : null,
                    childCount > 0 ? t('rsvpPartyChildren', { count: childCount }) : null,
                ].filter(Boolean);
                const contactParts = entry.replyOnly ? [rsvp?.phone, rsvp?.email].filter((part): part is string => Boolean(part)) : [];

                return {
                    entry,
                    id: entry.id,
                    name: entry.name,
                    status: entry.status,
                    partyLabel: partyParts.length > 0 ? partyParts.join(', ') : t('rsvpParty', { count: 0 }),
                    notes: rsvp?.notes ?? null,
                    contact: contactParts.length > 0 ? contactParts.join(' · ') : null,
                    possibleDuplicate: Boolean(rsvp?.possibleDuplicate),
                };
            }),
        [entries, t],
    );
}
