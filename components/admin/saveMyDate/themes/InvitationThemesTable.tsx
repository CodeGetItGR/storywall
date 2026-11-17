'use client';

import { useTranslations } from 'next-intl';

import { AdminSortableList } from '@/components/admin/AdminSortableList';
import { InvitationThemeRow } from '@/components/admin/saveMyDate/themes/InvitationThemeRow';
import type { AdminInvitationThemeSummaryDto } from '@/lib/adminInvitationThemes';
import type { MoveDirection } from '@/lib/sortOrder';

const themeIdOf = (theme: AdminInvitationThemeSummaryDto) => theme.id;

export function InvitationThemesTable({
    themes,
    hasAnyThemes,
    eventTypeLabels,
    canReorder,
    reorderHint,
    onMoveAction,
    onReorderAction,
    onEditAction,
    onPreviewAction,
}: {
    themes: AdminInvitationThemeSummaryDto[];
    hasAnyThemes: boolean;
    eventTypeLabels: Record<string, string>;
    canReorder: boolean;
    // Why the arrows are off, when picking an event type turns them on.
    reorderHint: string | undefined;
    onMoveAction: (themeId: string, direction: MoveDirection) => void;
    onReorderAction: (activeId: string, overId: string) => void;
    onEditAction: (themeId: string) => void;
    onPreviewAction: (themeId: string) => void;
}) {
    const t = useTranslations('AdminPage.invitationThemes');
    const tAdmin = useTranslations('AdminPage');

    if (themes.length === 0) {
        return <p className="px-3 py-8 text-center text-sm text-ink-muted">{hasAnyThemes ? t('noMatches') : t('empty')}</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-left">
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-3 py-2">{t('columns.theme')}</th>
                        <th className="px-3 py-2">{t('columns.eventType')}</th>
                        <th className="px-3 py-2">{t('columns.status')}</th>
                        <th className="px-3 py-2">{t('columns.slug')}</th>
                        <th className="px-3 py-2">{t('columns.updatedAt')}</th>
                        <th className="px-3 py-2">{tAdmin('order.column')}</th>
                        <th className="px-3 py-2" />
                    </tr>
                </thead>
                <tbody>
                    <AdminSortableList ids={themes.map(themeIdOf)} disabled={!canReorder} onReorderAction={onReorderAction}>
                        {themes.map((theme, index) => (
                            <InvitationThemeRow
                                key={theme.id}
                                theme={theme}
                                eventTypeLabel={eventTypeLabels[theme.eventType] ?? theme.eventType}
                                isFirst={index === 0}
                                isLast={index === themes.length - 1}
                                canReorder={canReorder}
                                reorderHint={reorderHint}
                                onMoveAction={onMoveAction}
                                onEditAction={onEditAction}
                                onPreviewAction={onPreviewAction}
                            />
                        ))}
                    </AdminSortableList>
                </tbody>
            </table>
        </div>
    );
}
