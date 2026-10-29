'use client';

import { AlertTriangle, BarChart3, Eye, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useQrCardHref } from '@/hooks/useQrCardTemplates';
import { useQrLinkManagement } from '@/hooks/useQrLinkManagement';
import type { QrLinkResponseDto, QrLinkStatsDto } from '@/lib/api/types';
import { demoGuestPagePathForEvent } from '@/lib/demo/demoRouting';
import { getQrStatusTone } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

import { QrCodeCard } from './QrCodeCard';
import { QrStatsSheet } from './QrStatsSheet';
import { ShareLinkSection } from './ShareLinkSection';

const SECONDARY_ACTION_CLASS =
    'flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink';

// One share link laid out inline: the link, its QR code, then the host's tools for it.
export function ShareLinkPanel({
    eventId,
    qrLink,
    stats,
    canWrite,
    onClampNoticeAction,
}: {
    eventId: string;
    qrLink: QrLinkResponseDto;
    stats?: QrLinkStatsDto;
    canWrite: boolean;
    onClampNoticeAction?: (message: string) => void;
}) {
    const t = useTranslations('ManagePage');
    const tDemo = useTranslations('Demo');
    const toErrorMessage = useApiErrorMessage();
    const cardHref = useQrCardHref(qrLink.eventId, qrLink.id);
    const management = useQrLinkManagement({ eventId, qrLink, stats, canWrite, onClampNoticeAction });
    // Only in the demo: the invitation a guest would see, on this device.
    const demoInviteHref = management.isActive ? demoGuestPagePathForEvent(eventId, 'invite') : null;

    return (
        <div className="flex flex-col gap-8">
            {/* Status */}
            {!management.isActive && (
                <span className={cn('self-start rounded-full px-2 py-1 text-xs font-bold', getQrStatusTone(qrLink.status))}>
                    {t(`qr.status.${qrLink.status}`)}
                </span>
            )}

            {/* Link and QR code: stacked on phones, side by side from md up */}
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_18rem]">
                <ShareLinkSection qrLink={qrLink} />

                {/* QR code */}
                <section aria-labelledby={`share-qr-${qrLink.id}`}>
                    <h2 id={`share-qr-${qrLink.id}`} className="mb-2 text-sm font-semibold text-ink">
                        {t('qr.sections.qr')}
                    </h2>
                    <div className="mx-auto w-full max-w-xs">
                        <QrCodeCard qrLink={qrLink} cardHref={cardHref} linkActions={false} />
                    </div>
                </section>
            </div>

            {/* Guest limit */}
            {management.isEditing && management.canEditLimit && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-muted/70 p-2">
                    <label className="flex items-center gap-2 text-xs text-ink-muted">
                        {t('qr.fields.maxGuests')}
                        <input
                            type="number"
                            min={1}
                            max={1000}
                            value={management.maxGuests}
                            onChange={management.changeMaxGuests}
                            className="w-20 rounded-lg bg-card px-2 py-1 text-sm text-ink transition outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={management.saveLimit}
                        disabled={management.isSavingLimit}
                        className="ml-auto rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:opacity-40"
                    >
                        {management.isSavingLimit ? t('qr.saving') : t('invitations.save')}
                    </button>
                    <button
                        type="button"
                        onClick={management.stopEditing}
                        className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
                    >
                        {t('invitations.create.cancel')}
                    </button>
                    {management.saveLimitError && <p className="basis-full text-xs text-rose-500">{toErrorMessage(management.saveLimitError)}</p>}
                </div>
            )}

            {/* More actions */}
            {(stats || demoInviteHref || (management.canEditLimit && !management.isEditing) || management.canRevoke) && (
                <div className="flex flex-wrap items-center gap-1.5">
                    {stats && (
                        <button type="button" onClick={management.openStats} className={SECONDARY_ACTION_CLASS}>
                            <BarChart3 className="h-3.5 w-3.5" />
                            {t('qr.stats.cta')}
                        </button>
                    )}
                    {stats && management.isLowOnSlots && (
                        <button
                            type="button"
                            onClick={management.openStats}
                            className="flex items-center gap-1 px-1 text-xs font-semibold text-amber-700"
                        >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {t('qr.stats.lowSlots', { count: management.remainingSlots ?? 0 })}
                        </button>
                    )}
                    {demoInviteHref && (
                        <AppLink href={demoInviteHref} className={SECONDARY_ACTION_CLASS}>
                            <Eye className="h-3.5 w-3.5" />
                            {tDemo('previewInvite')}
                        </AppLink>
                    )}
                    {management.canEditLimit && !management.isEditing && (
                        <button type="button" onClick={management.startEditing} className={SECONDARY_ACTION_CLASS}>
                            <Pencil className="h-3.5 w-3.5" />
                            {t('qr.editLimit')}
                        </button>
                    )}
                    {management.canRevoke && (
                        <button
                            type="button"
                            onClick={management.openRevokeConfirm}
                            className="flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-50"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t('qr.revoke')}
                        </button>
                    )}
                </div>
            )}

            {stats && (
                <QrStatsSheet
                    qrLink={qrLink}
                    stats={stats}
                    open={management.statsOpen}
                    onCloseAction={management.closeStats}
                    canRaiseLimit={management.canEditLimit}
                    onRaiseLimitAction={management.raiseLimitFromStats}
                />
            )}
            <ConfirmActionModal
                open={management.revokeConfirmOpen}
                onCloseAction={management.closeRevokeConfirm}
                onConfirmAction={management.revoke}
                title={t('qr.revokeConfirmTitle')}
                body={t('qr.revokeConfirmBody')}
                confirmLabel={t('qr.confirmRevoke')}
                cancelLabel={t('invitations.create.cancel')}
                isConfirming={management.isRevoking}
            />
        </div>
    );
}
