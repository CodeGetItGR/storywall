import { CheckCircle2, Clock, HelpCircle, Users } from 'lucide-react';
import type { useTranslations } from 'next-intl';
import type { ElementType } from 'react';
import { useMemo } from 'react';

import { type RsvpDisplayStatus, rsvpStatusOrder, rsvpStatusTone } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

type Member = { id: string; displayName: string; role: string };
type Rsvp = {
    eventMemberId: string;
    attendanceStatus: 'ATTENDING' | 'DECLINED' | 'MAYBE';
    notes: string | null;
    adultCount: number;
    childCount: number;
};

function SummaryCard({ label, value, icon: Icon }: { label: string; value: number; icon: ElementType }) {
    return (
        <div>
            <Icon className="h-4 w-4 text-ink-faint" aria-hidden="true" />
            <p className="mt-2 text-xl font-bold leading-none tracking-tight text-ink tabular-nums sm:text-2xl">{value}</p>
            <p className="mt-1 text-[11px] font-semibold leading-tight text-ink-muted">{label}</p>
        </div>
    );
}

export default function RsvpTab({ t, members, rsvps }: { t: ReturnType<typeof useTranslations>; members: Member[]; rsvps: Rsvp[] }) {
    const rsvpByMember = useMemo(() => new Map(rsvps.map((rsvp) => [rsvp.eventMemberId, rsvp])), [rsvps]);

    const guests = useMemo(() => members.filter((member) => member.role !== 'HOST'), [members]);

    const sortedGuests = useMemo(
        () =>
            [...guests].sort((left, right) => {
                const leftStatus: RsvpDisplayStatus = rsvpByMember.get(left.id)?.attendanceStatus ?? 'NO_RESPONSE';
                const rightStatus: RsvpDisplayStatus = rsvpByMember.get(right.id)?.attendanceStatus ?? 'NO_RESPONSE';
                const orderDelta = rsvpStatusOrder[leftStatus] - rsvpStatusOrder[rightStatus];
                return orderDelta !== 0 ? orderDelta : left.displayName.localeCompare(right.displayName);
            }),
        [guests, rsvpByMember]
    );

    const attending = guests.filter((member) => rsvpByMember.get(member.id)?.attendanceStatus === 'ATTENDING').length;
    const pending = guests.filter((member) => !rsvpByMember.get(member.id)).length;
    const maybe = guests.filter((member) => rsvpByMember.get(member.id)?.attendanceStatus === 'MAYBE').length;
    const declined = guests.filter((member) => rsvpByMember.get(member.id)?.attendanceStatus === 'DECLINED').length;
    const responded = guests.length - pending;
    const seatsClaimed = rsvps.reduce((sum, rsvp) => sum + rsvp.adultCount + rsvp.childCount, 0);
    const notesCount = rsvps.filter((rsvp) => Boolean(rsvp.notes?.trim())).length;

    return (
        <div className="px-4 flex flex-col gap-4">
            <p className="text-xs text-ink-muted">{t('rsvpSummary', { total: guests.length, attending })}</p>

            <div className="grid grid-cols-4 gap-3">
                <SummaryCard label={t('stats.totalGuests.label')} value={guests.length} icon={Users} />
                <SummaryCard label={t('rsvpBreakdown.attending')} value={attending} icon={CheckCircle2} />
                <SummaryCard label={t('rsvpBreakdown.noResponse')} value={pending} icon={Clock} />
                <SummaryCard label={t('rsvpSeats')} value={seatsClaimed} icon={HelpCircle} />
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] font-medium text-ink-muted">
                <span className="rounded-full bg-surface-muted px-2.5 py-1">
                    {t('rsvpInsights', { responded, pending, seats: seatsClaimed, notes: notesCount })}
                </span>
                <span className="rounded-full bg-surface-muted px-2.5 py-1">
                    {t('rsvpBreakdown.maybe')}: {maybe}
                </span>
                <span className="rounded-full bg-surface-muted px-2.5 py-1">
                    {t('rsvpBreakdown.declined')}: {declined}
                </span>
            </div>

            <div className="border-t border-border">
                <div className="flex items-center justify-between border-b border-border py-3">
                    <div>
                        <p className="text-sm font-semibold text-ink">{t('tabs.rsvp')}</p>
                        <p className="text-xs text-ink-muted">
                            {responded} {t('rsvpResponded')}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-ink-muted">{t('rsvpBreakdown.attending')}</p>
                        <p className="text-sm font-bold text-ink tabular-nums">{attending}</p>
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {sortedGuests.map((member) => {
                        const rsvp = rsvpByMember.get(member.id);
                        const status = rsvp?.attendanceStatus ?? 'NO_RESPONSE';
                        const partySize = rsvp ? rsvp.adultCount + rsvp.childCount : 0;
                        const statusLabel = rsvp ? t(`rsvpStatus.${status}`) : t('rsvpStatus.NO_RESPONSE');

                        return (
                            <div key={member.id} className="py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-semibold leading-tight text-ink">{member.displayName}</p>
                                            {partySize > 1 && (
                                                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                                                    +{partySize - 1}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-ink-muted">{status !== 'NO_RESPONSE' ? statusLabel : t('rsvpAwaiting')}</p>
                                    </div>

                                    <span
                                        className={cn('shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold', rsvpStatusTone[status])}
                                    >
                                        {statusLabel}
                                    </span>
                                </div>

                                {rsvp?.notes && <p className="mt-2 max-w-[70ch] text-xs leading-6 text-ink-muted">{rsvp.notes}</p>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {guests.length === 0 && <p className="py-8 text-center text-sm text-ink-muted">{t('noGuestsYet')}</p>}
        </div>
    );
}
