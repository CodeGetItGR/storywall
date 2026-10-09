'use client';

import { ArrowLeftRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { OrderCard } from '@/components/admin/orders/OrderCard';
import type { AdminEventDetailDto } from '@/lib/api/types';

// The plan by name and code. What it gives in storage and members is in Limits, so it isn't repeated here.
export function EventPlanSection({
    plan,
    editable,
    onChangeAction,
}: {
    plan: AdminEventDetailDto['plan'];
    editable: boolean;
    onChangeAction: () => void;
}) {
    const t = useTranslations('AdminPage.events.plan');

    return (
        <OrderCard title={t('title')}>
            <div className="flex items-center gap-3">
                {/* Name and code */}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-ink">{plan?.name ?? t('none')}</p>
                    {plan && <p className="mt-0.5 font-mono text-xs text-ink-muted">{plan.code}</p>}
                </div>

                {/* Change */}
                {editable && (
                    <button
                        type="button"
                        onClick={onChangeAction}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold text-ink transition hover:bg-canvas"
                    >
                        <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
                        {t('change')}
                    </button>
                )}
            </div>
        </OrderCard>
    );
}
