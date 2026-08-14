'use client';

import { AlertTriangle, BarChart3, Copy, Pencil, QrCode, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useEffect, useState } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useRevokeQrLink, useUpdateQrLink } from '@/hooks/useQrLinks';
import type { QrLinkResponseDto, QrLinkStatsDto } from '@/lib/api/types';
import { getQrStatusTone, type QrDisplayStatus } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

import { QrPreviewModal } from './QrPreviewModal';
import { QrStatsSheet } from './QrStatsSheet';

export function QrLinkRow({
    eventId,
    qrLink,
    stats,
    canWrite,
    onClampNotice,
}: {
    eventId: string;
    qrLink: QrLinkResponseDto;
    stats?: QrLinkStatsDto;
    canWrite: boolean;
    onClampNotice?: (message: string) => void;
}) {
    const t = useTranslations('ManagePage');
    const [previewOpen, setPreviewOpen] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [maxGuests, setMaxGuests] = useState(qrLink.maxGuests ?? stats?.maxGuests ?? 50);
    const revokeQrLink = useRevokeQrLink(eventId);
    const updateQrLink = useUpdateQrLink(eventId, qrLink.id);
    const toErrorMessage = useApiErrorMessage();

    const status: QrDisplayStatus = qrLink.status;
    const canEditLimit = canWrite && qrLink.targetType !== 'INVITATION' && qrLink.maxGuests !== null;
    const remainingSlots = stats?.remainingSlots ?? null;
    const isLowOnSlots = remainingSlots !== null && remainingSlots <= 5;

    const handleStartEditing = useCallback(() => {
        if (!canEditLimit) return;
        setIsEditing(true);
    }, [canEditLimit]);

    const handlePreviewOpen = useCallback(() => {
        setPreviewOpen(true);
    }, []);

    const handlePreviewClose = useCallback(() => {
        setPreviewOpen(false);
    }, []);

    const handleStatsOpen = useCallback(() => {
        setStatsOpen(true);
    }, []);

    const handleStatsClose = useCallback(() => {
        setStatsOpen(false);
    }, []);

    const handleRevokeConfirmOpen = useCallback(() => {
        setRevokeConfirmOpen(true);
    }, []);

    const handleRevokeConfirmClose = useCallback(() => {
        setRevokeConfirmOpen(false);
    }, []);

    const handleStopEditing = useCallback(() => {
        setIsEditing(false);
        setMaxGuests(qrLink.maxGuests ?? stats?.maxGuests ?? 50);
    }, [qrLink.maxGuests, stats?.maxGuests]);

    useEffect(() => {
        if (!isEditing) {
            setMaxGuests(qrLink.maxGuests ?? stats?.maxGuests ?? 50);
        }
    }, [isEditing, qrLink.maxGuests, stats?.maxGuests]);

    async function handleCopy() {
        await navigator.clipboard.writeText(qrLink.publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    async function handleRevoke() {
        if (!canWrite) return;
        setRevokeConfirmOpen(false);
        await revokeQrLink.mutateAsync(qrLink.id);
    }

    async function handleSaveLimit() {
        if (!canEditLimit) return;
        const requestedMaxGuests = maxGuests;
        const updated = await updateQrLink.mutateAsync({ maxGuests: requestedMaxGuests });
        if (updated.maxGuests !== requestedMaxGuests) {
            onClampNotice?.(t('qr.cappedToPlan', { count: updated.maxGuests ?? requestedMaxGuests }));
        }
        setMaxGuests(updated.maxGuests ?? requestedMaxGuests);
        setIsEditing(false);
    }

    function handleMaxGuestsChange(event: ChangeEvent<HTMLInputElement>) {
        setMaxGuests(Math.min(1000, Math.max(1, Number(event.target.value))));
    }

    function handleRaiseLimitFromStats() {
        if (!canEditLimit) return;
        setStatsOpen(false);
        setIsEditing(true);
    }

    return (
        <div className="flex flex-col gap-2 py-3 first:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-sm leading-5 font-semibold text-ink">{qrLink.label || t('qr.untitled')}</p>
                        <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold', getQrStatusTone(status))}>
                            {t(`qr.status.${status}`)}
                        </span>
                        <span className="text-xs leading-5 text-ink-muted">{t(`qr.targetTypes.${qrLink.targetType}`)}</span>
                    </div>
                </div>

                {stats && isLowOnSlots && (
                    <button type="button" onClick={handleStatsOpen} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t('qr.stats.lowSlots', { count: remainingSlots })}
                    </button>
                )}
            </div>

            {isEditing && canEditLimit && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-muted/70 p-2">
                    <label className="flex items-center gap-2 text-xs text-ink-muted">
                        {t('qr.fields.maxGuests')}
                        <input
                            type="number"
                            min={1}
                            max={1000}
                            value={maxGuests}
                            onChange={handleMaxGuestsChange}
                            className="w-20 rounded-lg bg-card px-2 py-1 text-sm text-ink outline-none transition focus:ring-2 focus:ring-primary/30"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={handleSaveLimit}
                        disabled={updateQrLink.isPending}
                        className="ml-auto rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                        {updateQrLink.isPending ? t('qr.saving') : t('invitations.save')}
                    </button>
                    <button
                        type="button"
                        onClick={handleStopEditing}
                        className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
                    >
                        {t('invitations.create.cancel')}
                    </button>
                    {updateQrLink.isError && <p className="basis-full text-xs text-rose-500">{toErrorMessage(updateQrLink.error)}</p>}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-40 flex-1 truncate text-xs text-ink-muted">{qrLink.publicUrl}</p>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {stats && (
                        <button
                            type="button"
                            onClick={handleStatsOpen}
                            className="flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                        >
                            <BarChart3 className="h-3.5 w-3.5" />
                            {t('qr.stats.cta')}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handlePreviewOpen}
                        className="flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                    >
                        <QrCode className="h-3.5 w-3.5" />
                        {t('qr.preview')}
                    </button>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                    >
                        <Copy className="h-3.5 w-3.5" />
                        {copied ? t('invitations.copied') : t('invitations.copyLink')}
                    </button>
                    {canEditLimit && !isEditing && (
                        <button
                            type="button"
                            onClick={handleStartEditing}
                            className="flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            {t('qr.editLimit')}
                        </button>
                    )}
                    {canWrite && status === 'ACTIVE' && (
                        <button
                            type="button"
                            onClick={handleRevokeConfirmOpen}
                            className="flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-50"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t('qr.revoke')}
                        </button>
                    )}
                </div>
            </div>

            <QrPreviewModal qrLink={qrLink} open={previewOpen} onClose={handlePreviewClose} />
            {stats && (
                <QrStatsSheet
                    qrLink={qrLink}
                    stats={stats}
                    open={statsOpen}
                    onClose={handleStatsClose}
                    canRaiseLimit={canEditLimit}
                    onRaiseLimit={handleRaiseLimitFromStats}
                />
            )}
            <ConfirmActionModal
                open={revokeConfirmOpen}
                onClose={handleRevokeConfirmClose}
                onConfirm={handleRevoke}
                title={t('qr.revokeConfirmTitle')}
                body={t('qr.revokeConfirmBody')}
                confirmLabel={t('qr.confirmRevoke')}
                cancelLabel={t('invitations.create.cancel')}
                isConfirming={revokeQrLink.isPending}
            />
        </div>
    );
}
