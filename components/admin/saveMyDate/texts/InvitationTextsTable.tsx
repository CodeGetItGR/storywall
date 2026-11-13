'use client';

import { useTranslations } from 'next-intl';

import { InvitationTextGroupRows } from '@/components/admin/saveMyDate/texts/InvitationTextGroupRows';
import type { AdminInvitationTextDto, InvitationTextGroup } from '@/lib/adminInvitationTexts';

// One table, one row group per event type and language: a text moves only within its group.
export function InvitationTextsTable({
    groups,
    eventTypeLabelOf,
    onEditAction,
}: {
    groups: InvitationTextGroup[];
    eventTypeLabelOf: (key: string) => string;
    onEditAction: (text: AdminInvitationTextDto) => void;
}) {
    const t = useTranslations('AdminPage.saveMyDate.texts');
    const tAdmin = useTranslations('AdminPage');
    const tDrawer = useTranslations('AdminPage.invitationThemes.drawer');
    const tFields = useTranslations('AdminPage.partnerApplications.fields');

    if (groups.length === 0) return <p className="px-3 py-8 text-center text-sm text-ink-muted">{t('empty')}</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-200 table-fixed text-left">
                <colgroup>
                    <col className="w-36" />
                    <col className="w-20" />
                    <col className="w-56" />
                    <col />
                    <col className="w-32" />
                    <col className="w-12" />
                </colgroup>
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-3 py-2">{tDrawer('eventType')}</th>
                        <th className="px-3 py-2">{tFields('language')}</th>
                        <th className="px-3 py-2">{t('label')}</th>
                        <th className="px-3 py-2">{t('body')}</th>
                        <th className="px-3 py-2">{tAdmin('order.column')}</th>
                        <th className="px-3 py-2" />
                    </tr>
                </thead>
                {groups.map((group) => (
                    <InvitationTextGroupRows
                        key={group.key}
                        group={group}
                        eventTypeLabel={eventTypeLabelOf(group.eventType)}
                        onEditAction={onEditAction}
                    />
                ))}
            </table>
        </div>
    );
}
