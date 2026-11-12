'use client';

import { Eye, Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { InvitationThemeStatusPill } from '@/components/admin/saveMyDate/themes/InvitationThemeStatusPill';
import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { AdminInvitationThemeSummaryDto } from '@/lib/adminInvitationThemes';
import { formatDate } from '@/lib/datetime';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

export function InvitationThemeRow({
    theme,
    eventTypeLabel,
    onEditAction,
    onPreviewAction,
}: {
    theme: AdminInvitationThemeSummaryDto;
    eventTypeLabel: string;
    onEditAction: (themeId: string) => void;
    onPreviewAction: (themeId: string) => void;
}) {
    const t = useTranslations('AdminPage.invitationThemes');
    const tAlt = useTranslations('ImageAlt');
    const locale = useLocale();
    const editLabel = t('edit', { name: theme.name });
    const previewLabel = t('preview', { name: theme.name });

    function handleEdit() {
        onEditAction(theme.id);
    }

    function handlePreview() {
        onPreviewAction(theme.id);
    }

    return (
        <tr className="border-b border-border/70 last:border-b-0 hover:bg-canvas/60">
            {/* Theme */}
            <td className="px-3 py-2">
                <button type="button" onClick={handleEdit} className="flex min-w-0 items-center gap-3 text-left">
                    <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md border border-border bg-canvas">
                        {theme.cardThumbUrl && (
                            <ProtectedImage
                                src={theme.cardThumbUrl}
                                alt={tAlt('invitationThemeThumbnail', { name: theme.name })}
                                fill
                                className="object-cover"
                                sizes="36px"
                            />
                        )}
                    </span>
                    <span className="truncate text-sm font-semibold text-ink">{theme.name}</span>
                </button>
            </td>
            {/* Event type */}
            <td className="px-3 py-2">
                <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-ink-muted">{eventTypeLabel}</span>
            </td>
            {/* Status */}
            <td className="px-3 py-2">
                <InvitationThemeStatusPill status={theme.status} />
            </td>
            {/* Slug */}
            <td className="px-3 py-2 font-mono text-[12px] text-ink-muted">{theme.slug}</td>
            {/* Last edited */}
            <td className="px-3 py-2 font-mono text-[12px] whitespace-nowrap text-ink-muted">{formatDate(locale, theme.updatedAt, DATE_FORMAT)}</td>
            {/* Actions */}
            <td className="px-3 py-2">
                <div className="flex justify-end gap-1">
                    <button
                        type="button"
                        onClick={handlePreview}
                        aria-label={previewLabel}
                        title={previewLabel}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleEdit}
                        aria-label={editLabel}
                        title={editLabel}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
