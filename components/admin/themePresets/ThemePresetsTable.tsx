'use client';

import { useTranslations } from 'next-intl';

import { ThemePresetRow } from '@/components/admin/themePresets/ThemePresetRow';
import type { AdminThemePresetDto } from '@/lib/api/types';
import type { MoveDirection } from '@/lib/sortOrder';

export function ThemePresetsTable({
    presets,
    hasAnyPresets,
    eventTypeLabels,
    canReorder,
    onMoveAction,
    onEditAction,
}: {
    presets: AdminThemePresetDto[];
    hasAnyPresets: boolean;
    eventTypeLabels: Record<string, string>;
    canReorder: boolean;
    onMoveAction: (presetId: string, direction: MoveDirection) => void;
    onEditAction: (presetId: string) => void;
}) {
    const t = useTranslations('AdminPage.themePresets');

    if (presets.length === 0) {
        return <p className="px-3 py-8 text-center text-sm text-ink-muted">{hasAnyPresets ? t('noMatches') : t('empty')}</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left">
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-3 py-2">{t('columns.theme')}</th>
                        <th className="px-3 py-2">{t('columns.eventTypes')}</th>
                        <th className="px-3 py-2">{t('columns.status')}</th>
                        <th className="px-3 py-2">{t('columns.order')}</th>
                        <th className="px-3 py-2" />
                    </tr>
                </thead>
                <tbody>
                    {presets.map((preset, index) => (
                        <ThemePresetRow
                            key={preset.id}
                            preset={preset}
                            eventTypeLabels={eventTypeLabels}
                            isFirst={index === 0}
                            isLast={index === presets.length - 1}
                            canReorder={canReorder}
                            onMoveAction={onMoveAction}
                            onEditAction={onEditAction}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
