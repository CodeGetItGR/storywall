'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminOrderArrows } from '@/components/admin/AdminOrderArrows';
import { AdminSortableRow } from '@/components/admin/AdminSortableRow';
import { ProtectedImage } from '@/components/common/ProtectedImage';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { qrCardTemplateStatus } from '@/lib/adminQrCards';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import { isHexColor } from '@/lib/eventTheme';
import type { MoveDirection } from '@/lib/sortOrder';
import { cn } from '@/lib/utils';

const STATUS_PILL = {
    LIVE: 'bg-status-good-wash text-status-good',
    NO_ARTWORK: 'bg-status-warn-wash text-status-warn',
    ARCHIVED: 'bg-status-neutral-wash text-status-neutral',
} as const;

export function QrCardTemplateRow({
    template,
    eventTypeLabels,
    isFirst,
    isLast,
    canReorder,
    onMoveAction,
    onEditAction,
}: {
    template: AdminQrCardTemplateDto;
    eventTypeLabels: Record<string, string>;
    isFirst: boolean;
    isLast: boolean;
    canReorder: boolean;
    onMoveAction: (templateId: string, direction: MoveDirection) => void;
    onEditAction: (templateId: string) => void;
}) {
    const t = useTranslations('AdminPage.qrCards');
    const tAlt = useTranslations('ImageAlt');
    const localizedText = useLocalizedText();
    const name = localizedText(template.name);
    const status = qrCardTemplateStatus(template);

    function handleEdit() {
        onEditAction(template.id);
    }

    return (
        <AdminSortableRow id={template.id} name={name} className="border-b border-border/70 last:border-b-0">
            {/* Design */}
            <td className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                    <span className="relative h-12 w-8.5 shrink-0 overflow-hidden rounded-sm border border-border bg-white">
                        {template.artworkUrl && (
                            <ProtectedImage
                                src={template.artworkUrl}
                                alt={tAlt('qrCardTemplate', { name })}
                                fill
                                className="object-cover"
                                sizes="34px"
                            />
                        )}
                    </span>
                    <p className="min-w-0 truncate text-sm font-semibold text-ink">{name}</p>
                </div>
            </td>
            {/* Event types */}
            <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                    {template.eventTypes.map((eventType) => (
                        <span key={eventType} className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-bold text-ink-muted">
                            {eventTypeLabels[eventType] ?? eventType}
                        </span>
                    ))}
                </div>
            </td>
            {/* Code */}
            <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                    <span
                        className="h-4 w-4 shrink-0 rounded-sm border border-border"
                        style={isHexColor(template.codeColor) ? { backgroundColor: template.codeColor } : undefined}
                        aria-hidden="true"
                    />
                    <span className="font-mono text-[11px] text-ink-muted">{template.codeColor}</span>
                </div>
            </td>
            {/* Status */}
            <td className="px-3 py-2.5">
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap', STATUS_PILL[status])}>
                    {t(`status.${status}`)}
                </span>
            </td>
            {/* Order */}
            <td className="px-3 py-2.5">
                <AdminOrderArrows id={template.id} name={name} isFirst={isFirst} isLast={isLast} disabled={!canReorder} onMoveAction={onMoveAction} />
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
        </AdminSortableRow>
    );
}
