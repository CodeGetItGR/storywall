'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminOrderArrows } from '@/components/admin/AdminOrderArrows';
import { ProtectedImage } from '@/components/common/ProtectedImage';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { themePresetStatus } from '@/lib/adminThemePresets';
import type { AdminThemePresetDto } from '@/lib/api/types';
import { isHexColor } from '@/lib/eventTheme';
import type { MoveDirection } from '@/lib/sortOrder';
import { cn } from '@/lib/utils';

const STATUS_PILL = {
    OFFERED: 'bg-status-good-wash text-status-good',
    NEEDS_ILLUSTRATION: 'bg-status-warn-wash text-status-warn',
    ARCHIVED: 'bg-status-neutral-wash text-status-neutral',
} as const;

export function ThemePresetRow({
    preset,
    eventTypeLabels,
    isFirst,
    isLast,
    canReorder,
    onMoveAction,
    onEditAction,
}: {
    preset: AdminThemePresetDto;
    eventTypeLabels: Record<string, string>;
    isFirst: boolean;
    isLast: boolean;
    canReorder: boolean;
    onMoveAction: (presetId: string, direction: MoveDirection) => void;
    onEditAction: (presetId: string) => void;
}) {
    const t = useTranslations('AdminPage.themePresets');
    const localizedText = useLocalizedText();
    const name = localizedText(preset.name, preset.key);
    const status = themePresetStatus(preset);

    function handleEdit() {
        onEditAction(preset.id);
    }

    return (
        <tr className="border-b border-border/70 last:border-b-0">
            {/* Theme */}
            <td className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                    <span
                        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border"
                        style={isHexColor(preset.backgroundColor) ? { backgroundColor: preset.backgroundColor } : undefined}
                    >
                        {preset.illustrationUrl && (
                            <ProtectedImage src={preset.illustrationUrl} alt="" fill className="object-contain" sizes="40px" />
                        )}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{name}</p>
                        <p className="font-mono text-[11px] text-ink-muted">
                            {preset.key} · {preset.backgroundColor}
                        </p>
                    </div>
                </div>
            </td>
            {/* Event types */}
            <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                    {preset.eventTypes.map((eventType) => (
                        <span key={eventType} className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-bold text-ink-muted">
                            {eventTypeLabels[eventType] ?? eventType}
                        </span>
                    ))}
                </div>
            </td>
            {/* Status */}
            <td className="px-3 py-2.5">
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', STATUS_PILL[status])}>{t(`status.${status}`)}</span>
            </td>
            {/* Order */}
            <td className="px-3 py-2.5">
                <AdminOrderArrows id={preset.id} name={name} isFirst={isFirst} isLast={isLast} disabled={!canReorder} onMoveAction={onMoveAction} />
            </td>
            {/* Edit */}
            <td className="px-3 py-2.5 text-right">
                <button
                    type="button"
                    onClick={handleEdit}
                    aria-label={t('edit', { name })}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                >
                    <Pencil className="h-4 w-4" />
                </button>
            </td>
        </tr>
    );
}
