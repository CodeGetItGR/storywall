import { CheckCircle2, Clock, HelpCircle, XCircle } from 'lucide-react';
import type { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export default function RsvpTab({
    t,
    members,
    rsvps,
}: {
    t: ReturnType<typeof useTranslations>;
    members: { id: string; displayName: string; role: string }[];
    rsvps: {
        eventMemberId: string;
        attendanceStatus: 'ATTENDING' | 'DECLINED' | 'MAYBE';
        notes: string | null;
        adultCount: number;
        childCount: number;
    }[];
}) {
    const rsvpByMember = new Map(rsvps.map((r) => [r.eventMemberId, r]));
    const guests = members.filter((m) => m.role !== 'HOST');

    const attending = guests.filter((m) => rsvpByMember.get(m.id)?.attendanceStatus === 'ATTENDING').length;

    return (
        <div className="px-4 flex flex-col">
            <p className="text-xs text-ink-muted mb-3">{t('rsvpSummary', { total: guests.length, attending })}</p>
            <div className="flex flex-col divide-y divide-border">
                {guests.map((member) => {
                    const rsvp = rsvpByMember.get(member.id);
                    const status = rsvp?.attendanceStatus ?? null;
                    const partySize = rsvp ? rsvp.adultCount + rsvp.childCount : 0;
                    return (
                        <div key={member.id} className="py-4 flex items-start gap-3 first:pt-0">
                            <div
                                className={cn(
                                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                                    status === 'ATTENDING'
                                        ? 'bg-emerald-50'
                                        : status === 'MAYBE'
                                          ? 'bg-amber-50'
                                          : status === 'DECLINED'
                                            ? 'bg-rose-50'
                                            : 'bg-surface-muted'
                                )}
                            >
                                {status === 'ATTENDING' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                {status === 'MAYBE' && <HelpCircle className="w-5 h-5 text-amber-500" />}
                                {status === 'DECLINED' && <XCircle className="w-5 h-5 text-rose-500" />}
                                {!status && <Clock className="w-5 h-5 text-ink-faint" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                    <p className="text-sm font-semibold text-ink">{member.displayName}</p>
                                    {partySize > 1 && (
                                        <span className="text-xs text-ink-muted bg-surface-muted px-1.5 py-0.5 rounded-full">+{partySize - 1}</span>
                                    )}
                                </div>
                                <p className="text-xs text-ink-muted mt-0.5">{status ? t(`rsvpStatus.${status}`) : t('rsvpStatus.NO_RESPONSE')}</p>
                                {rsvp?.notes && <p className="text-xs text-ink-muted mt-1 italic line-clamp-2">&ldquo;{rsvp.notes}&rdquo;</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
            {guests.length === 0 && <p className="text-sm text-ink-muted text-center py-10">{t('noGuestsYet')}</p>}
        </div>
    );
}
