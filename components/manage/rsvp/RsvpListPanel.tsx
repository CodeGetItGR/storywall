'use client';

import { ChevronDown, Filter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback } from 'react';

import { useRsvpDuplicateActions } from '@/hooks/useRsvpDuplicateActions';
import { type RsvpListRow, useRsvpListRows } from '@/hooks/useRsvpListRows';
import { type RosterFilter, type RosterMember, type RosterRsvp, useRsvpRoster } from '@/hooks/useRsvpRoster';

import { RsvpDuplicateMark } from './RsvpDuplicateMark';
import { RsvpGuestSummary } from './RsvpGuestSummary';
import { RsvpRemoveReplyModal } from './RsvpRemoveReplyModal';
import { RsvpStatusPill } from './RsvpStatusPill';

const filters: { key: RosterFilter; labelKey: string }[] = [
    { key: 'all', labelKey: 'rsvpFilters.all' },
    { key: 'ATTENDING', labelKey: 'rsvpBreakdown.attending' },
    { key: 'DECLINED', labelKey: 'rsvpBreakdown.declined' },
    { key: 'NO_RESPONSE', labelKey: 'rsvpBreakdown.noResponse' },
];

type RsvpListPanelProps = {
    eventId: string;
    members: RosterMember[];
    rsvps: RosterRsvp[];
    canWrite: boolean;
};

export function RsvpListPanel({ eventId, members, rsvps, canWrite }: RsvpListPanelProps) {
    const t = useTranslations('ManagePage');
    const { filter, setFilter, counts, guestCount, visibleGuests } = useRsvpRoster(members, rsvps);
    const rows = useRsvpListRows(visibleGuests);
    const duplicates = useRsvpDuplicateActions(eventId);

    const handleFilterChange = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            setFilter(event.target.value as RosterFilter);
        },
        [setFilter],
    );

    const duplicateMark = (row: RsvpListRow) =>
        row.possibleDuplicate ? (
            <RsvpDuplicateMark
                entry={row.entry}
                canAct={canWrite}
                keeping={duplicates.keepingId === row.entry.rsvp?.id}
                onKeepAction={duplicates.keep}
                onRemoveAction={duplicates.askToRemove}
            />
        ) : null;

    return (
        <div className="flex flex-col gap-4">
            {/* Filters */}
            <div className="relative ml-auto inline-block w-max">
                <Filter className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
                <select
                    value={filter}
                    onChange={handleFilterChange}
                    className="min-h-5 appearance-none rounded-md border border-border bg-background py-2 pr-9 pl-8 text-sm font-semibold text-ink transition-colors hover:border-ink-faint focus:ring-2 focus:ring-primary/30 focus:outline-none"
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
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            </div>

            {/* Action error */}
            {duplicates.error && (
                <p role="alert" className="text-sm text-rose-600">
                    {duplicates.error}
                </p>
            )}

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
                            <li key={row.id} className="py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <RsvpGuestSummary
                                        row={row}
                                        details={
                                            <>
                                                <p className="mt-0.5 text-xs text-ink-faint">{row.partyLabel}</p>
                                                {row.notes && <p className="mt-1 text-xs leading-6 text-ink-muted">{row.notes}</p>}
                                            </>
                                        }
                                    />
                                    <RsvpStatusPill status={row.status} className="shrink-0" />
                                </div>
                                {/* Duplicate: full width, so the mark and both actions fit on a phone */}
                                {duplicateMark(row)}
                            </li>
                        ))}
                    </ul>

                    {/* Roster table (desktop) */}
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[640px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                    <th className="py-2.5 pr-3 font-bold">{t('rsvpColumns.guest')}</th>
                                    <th className="w-40 px-3 py-2.5 font-bold">{t('rsvpColumns.party')}</th>
                                    <th className="w-28 px-3 py-2.5 font-bold">{t('rsvpColumns.status')}</th>
                                    <th className="px-3 py-2.5 font-bold">{t('rsvpColumns.note')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.id} className="border-b border-border last:border-b-0">
                                        <td className="max-w-64 py-2.5 pr-3">
                                            <RsvpGuestSummary row={row} mark={duplicateMark(row)} />
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-ink-muted">{row.partyLabel}</td>
                                        <td className="px-3 py-2.5">
                                            <RsvpStatusPill status={row.status} />
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

            {/* Remove confirmation */}
            <RsvpRemoveReplyModal
                toRemove={duplicates.toRemove}
                isRemoving={duplicates.isRemoving}
                onCancelAction={duplicates.cancelRemove}
                onConfirmAction={duplicates.confirmRemove}
            />
        </div>
    );
}
