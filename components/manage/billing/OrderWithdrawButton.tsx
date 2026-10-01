import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { OrderSummaryDto } from '@/lib/api/types';

// The withdrawal function must be easy to find for the whole window (Art. 11a).
export function OrderWithdrawButton({ order, onWithdrawAction }: { order: OrderSummaryDto; onWithdrawAction: (order: OrderSummaryDto) => void }) {
    const t = useTranslations('EventPlanSettingsPage.orderWithdrawal');
    const handleClick = useCallback(() => onWithdrawAction(order), [onWithdrawAction, order]);

    // The button text is fixed by law; the hint says what it means in plain words.
    return (
        <div className="mt-1">
            <button
                type="button"
                onClick={handleClick}
                className="inline-flex min-h-9 items-center text-xs font-semibold text-primary-dark underline underline-offset-2"
            >
                {t('action')}
            </button>
            <p className="text-xs text-ink-muted">{t('actionHint')}</p>
        </div>
    );
}
