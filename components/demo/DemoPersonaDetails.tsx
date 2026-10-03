'use client';

import { CalendarCheck, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DemoPersonaRsvpSheet } from '@/components/demo/DemoPersonaRsvpSheet';
import { MemberRoleSheet } from '@/components/manage/members/MemberRoleSheet';
import { useDemoPersonaDetails } from '@/hooks/useDemoPersonaDetails';
import type { EventMemberResponseDto } from '@/lib/api/types';

const buttonClass = 'inline-flex min-h-9 max-w-48 items-center gap-1.5 rounded-md bg-white/10 px-3 hover:bg-white/20';

// The selected persona's role and RSVP, each opening its own sheet.
export function DemoPersonaDetails({ eventId, guest }: { eventId: string; guest: EventMemberResponseDto }) {
    const t = useTranslations('DemoActAs');
    const details = useDemoPersonaDetails(guest);

    return (
        <>
            {/* Role */}
            {details.canEditRole && (
                <button type="button" onClick={details.openRole} aria-label={t('roleFor', { name: guest.displayName })} className={buttonClass}>
                    <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{details.roleLabel ?? t('noRole')}</span>
                </button>
            )}

            {/* RSVP */}
            {details.canEditRsvp && (
                <button type="button" onClick={details.openRsvp} aria-label={t('rsvpFor', { name: guest.displayName })} className={buttonClass}>
                    <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{t(details.rsvpStatus)}</span>
                </button>
            )}

            {/* Sheets */}
            {details.openSheet === 'role' && <MemberRoleSheet eventId={eventId} member={guest} onCloseAction={details.closeSheet} />}
            {details.openSheet === 'rsvp' && <DemoPersonaRsvpSheet eventId={eventId} member={guest} onCloseAction={details.closeSheet} />}
        </>
    );
}
