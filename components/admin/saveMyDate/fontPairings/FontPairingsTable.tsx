'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EventTypeBadges } from '@/components/admin/saveMyDate/EventTypeBadges';
import { type AdminFontPairingDto, fontPairingFontLabel } from '@/lib/adminFontPairings';
import { cn } from '@/lib/utils';

export function FontPairingsTable({
    pairings,
    eventTypeLabelOf,
    onEditAction,
}: {
    pairings: AdminFontPairingDto[];
    eventTypeLabelOf: (key: string) => string;
    onEditAction: (pairing: AdminFontPairingDto) => void;
}) {
    const t = useTranslations('AdminPage.saveMyDate.fontPairings');
    const tSaveMyDate = useTranslations('AdminPage.saveMyDate');
    const tDrawer = useTranslations('AdminPage.invitationThemes.drawer');

    if (pairings.length === 0) return <p className="px-3 py-8 text-center text-sm text-ink-muted">{t('empty')}</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-left">
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-3 py-2">{tDrawer('name')}</th>
                        <th className="px-3 py-2">{t('fonts.title')}</th>
                        <th className="px-3 py-2">{t('fonts.body')}</th>
                        <th className="px-3 py-2">{t('fonts.button')}</th>
                        <th className="px-3 py-2">{tSaveMyDate('eventTypes')}</th>
                        <th className="px-3 py-2">{tDrawer('status')}</th>
                        <th className="px-3 py-2">{tDrawer('sortOrder')}</th>
                        <th className="px-3 py-2" />
                    </tr>
                </thead>
                <tbody>
                    {pairings.map((pairing) => (
                        <FontPairingRow key={pairing.id} pairing={pairing} eventTypeLabelOf={eventTypeLabelOf} onEditAction={onEditAction} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function FontPairingRow({
    pairing,
    eventTypeLabelOf,
    onEditAction,
}: {
    pairing: AdminFontPairingDto;
    eventTypeLabelOf: (key: string) => string;
    onEditAction: (pairing: AdminFontPairingDto) => void;
}) {
    const t = useTranslations('AdminPage.saveMyDate.fontPairings');
    const tThemes = useTranslations('AdminPage.invitationThemes');
    const editLabel = tThemes('edit', { name: pairing.name });

    function handleEdit() {
        onEditAction(pairing);
    }

    return (
        <tr className="border-b border-border/70 last:border-b-0 hover:bg-canvas/60">
            {/* Name */}
            <td className="px-3 py-2.5">
                <button type="button" onClick={handleEdit} className="text-left text-sm font-semibold text-ink hover:text-primary-dark">
                    {pairing.name}
                </button>
            </td>
            {/* Fonts */}
            <td className="px-3 py-2.5 text-sm text-ink">{fontPairingFontLabel(pairing.titleFont)}</td>
            <td className="px-3 py-2.5 text-sm text-ink">{fontPairingFontLabel(pairing.bodyFont)}</td>
            <td className={cn('px-3 py-2.5 text-sm', pairing.buttonFont ? 'text-ink' : 'text-ink-faint')}>
                {pairing.buttonFont ? fontPairingFontLabel(pairing.buttonFont) : t('sameAsText')}
            </td>
            {/* Event types */}
            <td className="px-3 py-2.5">
                <EventTypeBadges eventTypes={pairing.eventTypes} labelOf={eventTypeLabelOf} />
            </td>
            {/* Status */}
            <td className="px-3 py-2.5">
                <span
                    className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap',
                        pairing.hidden ? 'bg-status-warn-wash text-status-warn' : 'bg-status-good-wash text-status-good',
                    )}
                >
                    {pairing.hidden ? tThemes('status.HIDDEN') : t('shown')}
                </span>
            </td>
            {/* Order */}
            <td className="px-3 py-2.5 font-mono text-[12px] text-ink-muted tabular-nums">{pairing.sortOrder}</td>
            {/* Edit */}
            <td className="px-3 py-2.5 text-right">
                <button
                    type="button"
                    onClick={handleEdit}
                    aria-label={editLabel}
                    title={editLabel}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                >
                    <Pencil className="h-4 w-4" />
                </button>
            </td>
        </tr>
    );
}
