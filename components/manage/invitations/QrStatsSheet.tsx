'use client';

import { AlertTriangle } from 'lucide-react';
import React from 'react';

import { Modal } from '@/components/ui/modal';
import type { QrLinkResponseDto, QrLinkStatsDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

import type { ManageTranslations } from './shared';

export function QrStatsSheet({
    t,
    qrLink,
    stats,
    open,
    onClose,
    canRaiseLimit,
    onRaiseLimit,
}: {
    t: ManageTranslations;
    qrLink: QrLinkResponseDto;
    stats: QrLinkStatsDto;
    open: boolean;
    onClose: () => void;
    canRaiseLimit: boolean;
    onRaiseLimit: () => void;
}) {
    const remainingSlots = stats.remainingSlots ?? null;
    const isLowOnSlots = remainingSlots !== null && remainingSlots <= 5;

    return (
        <Modal open={open} onClose={onClose} closeLabel={t('invitations.create.cancel')} variant="sheet" size="md">
            <Modal.Body className="px-5 pt-6 pb-5">
                <div className="pr-8">
                    <p className="text-base font-bold text-ink">{t('qr.stats.title')}</p>
                    <p className="mt-1 truncate text-sm text-ink-muted">{qrLink.label || t('qr.untitled')}</p>
                </div>

                <div className="mt-5 divide-y divide-border rounded-lg border border-border bg-card">
                    <QrStatsRow label={t('qr.stats.joined')} value={stats.joinCount} />
                    <QrStatsRow
                        label={t('qr.stats.remainingSlots')}
                        value={stats.remainingSlots === null ? t('qr.stats.notAvailable') : stats.remainingSlots}
                        isWarning={isLowOnSlots}
                    />
                    <QrStatsRow label={t('qr.stats.maxGuests')} value={stats.maxGuests === null ? t('qr.stats.notAvailable') : stats.maxGuests} />
                    <QrStatsRow label={t('qr.stats.uploads')} value={stats.uploadCount} />
                    <QrStatsRow
                        label={t('qr.stats.lastJoined')}
                        value={stats.lastJoinedAt ? t('qr.stats.lastJoinedAt', { date: new Date(stats.lastJoinedAt) }) : t('qr.stats.noJoinsYet')}
                    />
                </div>

                {isLowOnSlots && canRaiseLimit && (
                    <button
                        type="button"
                        onClick={onRaiseLimit}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                        <AlertTriangle className="h-4 w-4" />
                        {t('qr.stats.raiseLimit')}
                    </button>
                )}
            </Modal.Body>
        </Modal>
    );
}

function QrStatsRow({ label, value, isWarning = false }: { label: string; value: React.ReactNode; isWarning?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
            <p className="text-sm text-ink-muted">{label}</p>
            <p className={cn('text-right text-sm font-semibold text-ink', isWarning && 'text-amber-700')}>{value}</p>
        </div>
    );
}
