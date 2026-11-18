'use client';

import { useTranslations } from 'next-intl';

import { useRsvpDuplicateActions } from '@/hooks/useRsvpDuplicateActions';
import { type RsvpListRow, useRsvpListRows } from '@/hooks/useRsvpListRows';
import { type RosterMember, type RosterRsvp, useRsvpRoster } from '@/hooks/useRsvpRoster';

import { RsvpDuplicateMark } from './RsvpDuplicateMark';
import { RsvpFilterChips } from './RsvpFilterChips';
import { RsvpGuestSummary } from './RsvpGuestSummary';
import { RsvpRemoveReplyModal } from './RsvpRemoveReplyModal';
import { RsvpStatusPill } from './RsvpStatusPill';

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
        <section aria-labelledby="rsvp-guests-title" className="flex flex-col gap-4">
            {/* Heading */}
            <h2 id="rsvp-guests-title" className="text-[17px] font-bold text-ink">
                {t('rsvpGuests.title')}
            </h2>

            {/* Filters */}
            {guestCount > 0 && <RsvpFilterChips filter={filter} counts={counts} guestCount={guestCount} onChangeAction={setFilter} />}

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
        </section>
    );
}
