'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback } from 'react';

import { type RosterFilter, type RosterMember, type RosterRsvp, useRsvpRoster } from '@/hooks/useRsvpRoster';
import { rsvpStatusTone } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

const filters: { key: RosterFilter; labelKey: string }[] = [
    { key: 'all', labelKey: 'rsvpFilters.all' },
    { key: 'ATTENDING', labelKey: 'rsvpBreakdown.attending' },
    { key: 'MAYBE', labelKey: 'rsvpBreakdown.maybe' },
    { key: 'DECLINED', labelKey: 'rsvpBreakdown.declined' },
    { key: 'NO_RESPONSE', labelKey: 'rsvpBreakdown.noResponse' },
];

export default function RsvpTab({ members, rsvps }: { members: RosterMember[]; rsvps: RosterRsvp[] }) {
    const t = useTranslations('ManagePage');
    const { filter, setFilter, counts, guestCount, visibleGuests, rsvpByMember, statusOf } = useRsvpRoster(members, rsvps);

    const handleFilterClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const next = event.currentTarget.dataset.filter as RosterFilter | undefined;
            if (next) setFilter(next);
        },
        [setFilter]
    );

    const rows = visibleGuests.map((member) => {
        const rsvp = rsvpByMember.get(member.id);
        const status = statusOf(member.id);

        return {
            id: member.id,
            name: member.displayName,
            status,
            statusLabel: t(`rsvpStatus.${status}`),
            partySize: rsvp ? rsvp.adultCount + rsvp.childCount : 0,
            notes: rsvp?.notes ?? null,
        };
    });

    return (
        <div className="flex flex-col gap-4">
            {/* Filters */}
            <div className="-mx-4 overflow-x-auto px-4 no-scrollbar lg:mx-0 lg:px-0">
                <div className="inline-flex w-max gap-1 rounded-full bg-surface-muted p-1">
                    {filters.map(({ key, labelKey }) => {
                        const count = key === 'all' ? guestCount : counts[key];
                        const isActive = filter === key;

                        return (
                            <button
                                key={key}
                                type="button"
                                data-filter={key}
                                onClick={handleFilterClick}
                                aria-pressed={isActive}
                                className={cn(
                                    'inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-semibold transition-colors',
                                    isActive ? 'bg-background text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                                )}
                            >
                                {t(labelKey)}
                                <span className="tabular-nums text-ink-faint">{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Roster */}
            {guestCount === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">{t('noGuestsYet')}</p>
            ) : rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">{t('rsvpFilters.empty')}</p>
            ) : (
                <>
                    {/* Roster rows (small screens) */}
                    <ul className="divide-y divide-border border-t border-border md:hidden">
                        {rows.map((row) => (
                            <li key={row.id} className="flex items-start justify-between gap-3 py-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold leading-tight text-ink">{row.name}</p>
                                    <p className="mt-0.5 text-xs text-ink-faint">{t('rsvpParty', { count: row.partySize })}</p>
                                    {row.notes && <p className="mt-1 text-xs leading-6 text-ink-muted">{row.notes}</p>}
                                </div>
                                <span
                                    className={cn('shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold', rsvpStatusTone[row.status])}
                                >
                                    {row.statusLabel}
                                </span>
                            </li>
                        ))}
                    </ul>

                    {/* Roster table (desktop) */}
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[640px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                    <th className="py-2.5 pr-3 font-bold">{t('rsvpColumns.guest')}</th>
                                    <th className="w-24 px-3 py-2.5 font-bold">{t('rsvpColumns.party')}</th>
                                    <th className="w-36 px-3 py-2.5 font-bold">{t('rsvpColumns.status')}</th>
                                    <th className="px-3 py-2.5 font-bold">{t('rsvpColumns.note')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.id} className="border-b border-border last:border-b-0">
                                        <td className="max-w-64 py-2.5 pr-3">
                                            <p className="truncate font-semibold text-ink">{row.name}</p>
                                        </td>
                                        <td className="px-3 py-2.5 tabular-nums text-ink-muted">{row.partySize}</td>
                                        <td className="px-3 py-2.5">
                                            <span
                                                className={cn(
                                                    'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                                                    rsvpStatusTone[row.status]
                                                )}
                                            >
                                                {row.statusLabel}
                                            </span>
                                        </td>
                                        <td className="max-w-80 px-3 py-2.5 text-ink-muted">
                                            <p className="truncate" title={row.notes ?? undefined}>
                                                {row.notes ?? '—'}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
