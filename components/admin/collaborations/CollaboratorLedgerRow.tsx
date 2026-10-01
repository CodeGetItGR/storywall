'use client';

import { Unlink2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent, MouseEvent } from 'react';

import { earningCodeText, shortId } from '@/lib/adminCollaborations';
import type { CollaborationCodeResponseDto, CollaborationEarningResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';

const STATUS_PILL: Record<CollaborationEarningResponseDto['status'], string> = {
    ACCRUED: 'bg-status-warn-wash text-status-warn',
    PAID: 'bg-status-good-wash text-status-good',
    REVERSED: 'bg-status-neutral-wash text-status-neutral',
};

export function CollaboratorLedgerRow({
    earning,
    codes,
    selected,
    voidable,
    onToggleAction,
    onVoidAction,
}: {
    earning: CollaborationEarningResponseDto;
    codes: CollaborationCodeResponseDto[];
    selected: boolean;
    voidable: boolean;
    onToggleAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onVoidAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const locale = useLocale();
    const accruedDate = formatDate(locale, earning.accruedAt, { dateStyle: 'medium' });
    // Names each row's controls for screen readers.
    const rowLabel = { event: earning.eventTitle ?? shortId(earning.eventId), date: accruedDate };

    return (
        <tr className="border-b border-border last:border-b-0 hover:bg-canvas/60">
            <td className="px-3 py-2">
                <input
                    type="checkbox"
                    value={earning.id}
                    checked={selected}
                    onChange={onToggleAction}
                    disabled={earning.status !== 'ACCRUED'}
                    aria-label={t('earnings.select', rowLabel)}
                    className="h-4 w-4 accent-primary disabled:opacity-30"
                />
            </td>
            <td className="px-2.5 py-2 whitespace-nowrap text-ink-muted">{accruedDate}</td>
            <td className="max-w-56 px-2.5 py-2">
                {earning.eventTitle ? (
                    <span className="block truncate text-ink">{earning.eventTitle}</span>
                ) : (
                    <span className="font-mono text-xs text-ink-faint">{shortId(earning.eventId)}</span>
                )}
            </td>
            <td className="px-2.5 py-2 font-mono text-xs font-bold text-ink">{earningCodeText(codes, earning.codeId)}</td>
            <td className="px-2.5 py-2 text-ink-muted">
                {t('earnings.basis', { percent: earning.commissionPercent, amount: formatMoney(locale, earning.basisAmountMinor, earning.currency) })}
            </td>
            <td className="px-2.5 py-2 whitespace-nowrap">
                <span className="font-mono font-semibold text-ink">{formatMoney(locale, earning.amountMinor, earning.currency)}</span>
                {earning.entryType === 'CLAWBACK' && (
                    <span className="ml-1.5 text-[10px] font-bold text-status-neutral">{t('earnings.entryTypes.CLAWBACK')}</span>
                )}
            </td>
            <td className="px-2.5 py-2">
                <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_PILL[earning.status])}>
                    {t(`earnings.status.${earning.status}`)}
                </span>
            </td>
            <td className="px-2.5 py-2">
                <p className="font-mono text-[11px] text-ink-faint">{earning.payoutReference ?? t('earnings.noReference')}</p>
                {earning.paidAt && <p className="text-[10.5px] text-ink-faint">{formatDate(locale, earning.paidAt, { dateStyle: 'medium' })}</p>}
            </td>
            <td className="px-2.5 py-2 text-right">
                <button
                    type="button"
                    data-earning-id={earning.id}
                    onClick={onVoidAction}
                    disabled={!voidable}
                    aria-label={t('void.rowAction', rowLabel)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-status-danger transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                    <Unlink2 className="h-3.5 w-3.5" />
                </button>
            </td>
        </tr>
    );
}
