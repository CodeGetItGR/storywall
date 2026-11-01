'use client';

import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { VendorMessageStatusPill } from '@/components/admin/vendorMessages/VendorMessageStatusPill';
import { vendorReplyHref } from '@/lib/adminVendorMessages';
import type { VendorContactMessageDto, VendorContactStatus } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function VendorMessageDrawer({
    message,
    isMarking,
    error,
    onMarkAction,
    onCloseAction,
}: {
    message: VendorContactMessageDto;
    isMarking: boolean;
    error: string | null;
    onMarkAction: (status: VendorContactStatus) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.vendorMessagesPanel');
    const locale = useLocale();
    const nextStatus: VendorContactStatus = message.status === 'NEW' ? 'ANSWERED' : 'NEW';

    function handleMarkClick() {
        onMarkAction(nextStatus);
    }

    return (
        <AdminDrawer
            open
            onClose={onCloseAction}
            closeLabel={t('close')}
            title={t('detailTitle')}
            subtitle={message.businessName}
            size="wide"
            footer={
                <div className="flex w-full flex-wrap items-center justify-end gap-2">
                    {error ? <p className="mr-auto text-sm text-status-danger">{error}</p> : null}
                    <button
                        type="button"
                        onClick={onCloseAction}
                        className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                    >
                        {t('close')}
                    </button>
                    <button
                        type="button"
                        onClick={handleMarkClick}
                        disabled={isMarking}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {isMarking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {nextStatus === 'ANSWERED' ? t('markAnswered') : t('markNew')}
                    </button>
                </div>
            }
        >
            <div className="space-y-7">
                {/* Summary */}
                <section className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-status-neutral-wash px-2.5 py-1 text-[11px] font-bold text-status-neutral">
                        {t(`topics.${message.topic}`)}
                    </span>
                    <VendorMessageStatusPill status={message.status} />
                    <span className="font-mono text-xs text-ink-muted">
                        {formatDate(locale, message.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                </section>

                {/* Message */}
                <section className="space-y-2">
                    <h3 className="text-xs font-bold tracking-wide text-ink-faint uppercase">{t('columns.message')}</h3>
                    <p className="text-sm leading-6 break-words whitespace-pre-wrap text-ink">{message.message}</p>
                </section>

                {/* Reply */}
                <section className="space-y-2">
                    <h3 className="text-xs font-bold tracking-wide text-ink-faint uppercase">{t('replyTo')}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[13px] break-all text-ink">{message.replyEmail}</span>
                        {message.emailVerified ? null : (
                            <span className="inline-flex rounded-full bg-status-warn-wash px-2.5 py-1 text-[11px] font-bold text-status-warn">
                                {t('notVerified')}
                            </span>
                        )}
                    </div>
                    <a href={vendorReplyHref(message.replyEmail)} className="inline-block text-sm font-semibold text-ink hover:underline">
                        {t('reply')}
                    </a>
                </section>

                {/* Identifiers */}
                <section className="grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
                    <AdminIdentifier label={t('messageId')} value={message.id} />
                    {message.userId ? <AdminIdentifier label={t('userId')} value={message.userId} /> : null}
                </section>
            </div>
        </AdminDrawer>
    );
}
