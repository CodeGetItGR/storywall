'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { VendorMessageStatusPill } from '@/components/admin/vendorMessages/VendorMessageStatusPill';
import { firstLine } from '@/lib/adminBetaFeedback';
import type { VendorContactMessageDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

export function VendorMessagesTable({ messages, onOpenAction }: { messages: VendorContactMessageDto[]; onOpenAction: (id: string) => void }) {
    const t = useTranslations('AdminPage.vendorMessagesPanel');
    const locale = useLocale();

    function handleOpen(event: MouseEvent<HTMLButtonElement>) {
        const id = event.currentTarget.dataset.messageId;
        if (id) onOpenAction(id);
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-5 py-3 font-bold">{t('columns.received')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.business')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.topic')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.message')}</th>
                        <th className="px-5 py-3 font-bold">{t('columns.status')}</th>
                    </tr>
                </thead>
                <tbody>
                    {messages.map((message) => (
                        <tr key={message.id} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                            <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap text-ink-muted">
                                {formatDate(locale, message.createdAt, DATE_FORMAT)}
                            </td>
                            <td className="max-w-48 truncate px-3 py-3.5 font-semibold text-ink">{message.businessName ?? message.replyEmail}</td>
                            <td className="px-3 py-3.5">
                                <span className="inline-flex rounded-full bg-status-neutral-wash px-2.5 py-1 text-[11px] font-bold text-status-neutral">
                                    {t(`topics.${message.topic}`)}
                                </span>
                            </td>
                            <td className="px-3 py-3.5">
                                <button
                                    type="button"
                                    data-message-id={message.id}
                                    onClick={handleOpen}
                                    aria-label={t('open', { name: message.businessName ?? message.replyEmail })}
                                    className="block max-w-md truncate text-left text-ink hover:underline"
                                >
                                    {firstLine(message.message)}
                                </button>
                            </td>
                            <td className="px-5 py-3.5">
                                <VendorMessageStatusPill status={message.status} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
