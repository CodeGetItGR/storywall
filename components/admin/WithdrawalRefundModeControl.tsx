'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import type { WithdrawalRefundMode } from '@/hooks/useWithdrawalDecision';
import type { KeepEventDayAvailability } from '@/lib/adminWithdrawals';
import { cn } from '@/lib/utils';

const OPTIONS: WithdrawalRefundMode[] = ['AS_CALCULATED', 'KEEP_EVENT_DAY'];

export function WithdrawalRefundModeControl({
    value,
    onChangeAction,
    keepEventDayAvailability,
}: {
    value: WithdrawalRefundMode;
    onChangeAction: (mode: WithdrawalRefundMode) => void;
    keepEventDayAvailability: KeepEventDayAvailability;
}) {
    const t = useTranslations('AdminPage');
    const keepEventDayBlocked = keepEventDayAvailability !== 'available';

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onChangeAction(event.currentTarget.dataset.mode as WithdrawalRefundMode);
    }

    return (
        <div>
            <p className="mb-2 text-sm font-bold text-ink">{t('withdrawals.refundMode.title')}</p>
            <div className="flex max-w-md gap-1 rounded-lg bg-canvas p-1">
                {OPTIONS.map((option) => (
                    <button
                        key={option}
                        type="button"
                        data-mode={option}
                        onClick={handleClick}
                        disabled={option === 'KEEP_EVENT_DAY' && keepEventDayBlocked}
                        aria-pressed={value === option}
                        className={cn(
                            'flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                            value === option ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted disabled:hover:text-ink-faint',
                        )}
                    >
                        {t(`withdrawals.refundMode.${option}`)}
                    </button>
                ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-faint">
                {keepEventDayAvailability === 'noConsent' || keepEventDayAvailability === 'notDue'
                    ? t(`withdrawals.keepEventDayUnavailable.${keepEventDayAvailability}`)
                    : t(`withdrawals.refundModeHint.${value}`)}
            </p>
        </div>
    );
}
