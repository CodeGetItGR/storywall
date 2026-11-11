'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { AdminInvitationTextDto } from '@/lib/adminInvitationTexts';

export function InvitationTextsTable({
    texts,
    eventTypeLabelOf,
    onEditAction,
}: {
    texts: AdminInvitationTextDto[];
    eventTypeLabelOf: (key: string) => string;
    onEditAction: (text: AdminInvitationTextDto) => void;
}) {
    const t = useTranslations('AdminPage.saveMyDate.texts');
    const tDrawer = useTranslations('AdminPage.invitationThemes.drawer');
    const tFields = useTranslations('AdminPage.partnerApplications.fields');

    if (texts.length === 0) return <p className="px-3 py-8 text-center text-sm text-ink-muted">{t('empty')}</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-200 table-fixed text-left">
                <colgroup>
                    <col className="w-36" />
                    <col className="w-20" />
                    <col className="w-56" />
                    <col />
                    <col className="w-20" />
                    <col className="w-12" />
                </colgroup>
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-3 py-2">{tDrawer('eventType')}</th>
                        <th className="px-3 py-2">{tFields('language')}</th>
                        <th className="px-3 py-2">{t('label')}</th>
                        <th className="px-3 py-2">{t('body')}</th>
                        <th className="px-3 py-2">{tDrawer('sortOrder')}</th>
                        <th className="px-3 py-2" />
                    </tr>
                </thead>
                <tbody>
                    {texts.map((text) => (
                        <InvitationTextRow key={text.id} text={text} eventTypeLabel={eventTypeLabelOf(text.eventType)} onEditAction={onEditAction} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function InvitationTextRow({
    text,
    eventTypeLabel,
    onEditAction,
}: {
    text: AdminInvitationTextDto;
    eventTypeLabel: string;
    onEditAction: (text: AdminInvitationTextDto) => void;
}) {
    const tThemes = useTranslations('AdminPage.invitationThemes');
    const tLanguages = useTranslations('AdminPage.partnerApplications.languages');
    const editLabel = tThemes('edit', { name: text.label });

    function handleEdit() {
        onEditAction(text);
    }

    return (
        <tr className="border-b border-border/70 align-top last:border-b-0 hover:bg-canvas/60">
            {/* Event type */}
            <td className="px-3 py-2.5">
                <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-ink-muted">{eventTypeLabel}</span>
            </td>
            {/* Language */}
            <td className="px-3 py-2.5 text-sm text-ink-muted">{tLanguages(text.language)}</td>
            {/* Label */}
            <td className="px-3 py-2.5">
                <button type="button" onClick={handleEdit} className="text-left text-sm font-semibold text-ink hover:text-primary-dark">
                    {text.label}
                </button>
            </td>
            {/* Text */}
            <td className="px-3 py-2.5">
                <p className="line-clamp-2 text-sm leading-5 whitespace-pre-line text-ink-muted">{text.body}</p>
            </td>
            {/* Order */}
            <td className="px-3 py-2.5 font-mono text-[12px] text-ink-muted tabular-nums">{text.sortOrder}</td>
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
