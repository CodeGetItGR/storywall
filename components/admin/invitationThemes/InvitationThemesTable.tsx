'use client';

import { useTranslations } from 'next-intl';

import { InvitationThemeRow } from '@/components/admin/invitationThemes/InvitationThemeRow';
import type { AdminInvitationThemeSummaryDto } from '@/lib/adminInvitationThemes';

export function InvitationThemesTable({
    themes,
    hasAnyThemes,
    eventTypeLabels,
    onEditAction,
    onPreviewAction,
}: {
    themes: AdminInvitationThemeSummaryDto[];
    hasAnyThemes: boolean;
    eventTypeLabels: Record<string, string>;
    onEditAction: (themeId: string) => void;
    onPreviewAction: (themeId: string) => void;
}) {
    const t = useTranslations('AdminPage.invitationThemes');

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
                        <th className="px-3 py-2" />
                    </tr>
                </thead>
                <tbody>
                    {themes.map((theme) => (
                        <InvitationThemeRow
                            key={theme.id}
                            theme={theme}
                            eventTypeLabel={eventTypeLabels[theme.eventType] ?? theme.eventType}
                            onEditAction={onEditAction}
                            onPreviewAction={onPreviewAction}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
