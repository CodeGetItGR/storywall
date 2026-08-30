'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback } from 'react';

import { type RosterFilter, type RosterMember, type RosterRsvp, useRsvpRoster } from '@/hooks/useRsvpRoster';
import { rsvpStatusTone } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

const filters: { key: RosterFilter; labelKey: string }[] = [
    { key: 'all', labelKey: 'rsvpFilters.all' },
    { key: 'ATTENDING', labelKey: 'rsvpBreakdown.attending' },
    { key: 'DECLINED', labelKey: 'rsvpBreakdown.declined' },
    { key: 'NO_RESPONSE', labelKey: 'rsvpBreakdown.noResponse' },
];

export function RsvpListPanel({ members, rsvps }: { members: RosterMember[]; rsvps: RosterRsvp[] }) {
    const t = useTranslations('ManagePage');
    const { filter, setFilter, counts, guestCount, visibleGuests, rsvpByMember, statusOf } = useRsvpRoster(members, rsvps);

    const handleFilterChange = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            setFilter(event.target.value as RosterFilter);
        },
        [setFilter]
    );

    const rows = visibleGuests.map((member) => {
        const rsvp = rsvpByMember.get(member.id);
        const status = statusOf(member.id);
        const adultCount = rsvp?.adultCount ?? 0;
        const childCount = rsvp?.childCount ?? 0;

        const partyParts = [
            adultCount > 0 ? t('rsvpPartyAdults', { count: adultCount }) : null,
            childCount > 0 ? t('rsvpPartyChildren', { count: childCount }) : null,
        ].filter(Boolean);

        return {
            id: member.id,
            name: member.displayName,
            status,
            statusLabel: t(`rsvpStatus.${status}`),
            partyLabel: partyParts.length > 0 ? partyParts.join(', ') : t('rsvpParty', { count: 0 }),
            notes: rsvp?.notes ?? null,
        };
    });

    return (
        <div className="flex flex-col gap-4">
            {/* Filters */}
            <div className="relative inline-block w-max ml-auto">
                <select
                    value={filter}
                    onChange={handleFilterChange}
                    className="min-h-7 appearance-none rounded-md border border-border bg-background py-2 pl-4 pr-9 text-sm font-semibold text-ink transition-colors hover:border-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                    {filters.map(({ key, labelKey }) => {
                        const count = key === 'all' ? guestCount : counts[key];
                        return (
                            <option key={key} value={key}>
                                {t(labelKey)} ({count})
                            </option>
                        );
                    })}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            </div>

            {/* Roster */}
            {guestCount === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">{t('noGuestsYet')}</p>
            ) : rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">{t('rsvpFilters.empty')}</p>
            ) : (
                <>
                    {/* Roster rows (small screens) */}
                    <ul className="divide-y divide-border border-t md:hidden">
                        {rows.map((row) => (
                            <li key={row.id} className="flex items-start justify-between gap-3 py-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold leading-tight text-ink">{row.name}</p>
                                    <p className="mt-0.5 text-xs text-ink-faint">{row.partyLabel}</p>
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
                                    <th className="w-40 px-3 py-2.5 font-bold">{t('rsvpColumns.party')}</th>
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
                                        <td className="px-3 py-2.5 whitespace-nowrap text-ink-muted">{row.partyLabel}</td>
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
