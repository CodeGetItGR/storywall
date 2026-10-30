'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { OutreachCitySplit } from '@/components/admin/outreach/OutreachCitySplit';
import { OutreachDueList } from '@/components/admin/outreach/OutreachDueList';
import { OutreachFunnel } from '@/components/admin/outreach/OutreachFunnel';
import { OutreachSummaryStrip } from '@/components/admin/outreach/OutreachSummaryStrip';
import { OutreachTypeMix } from '@/components/admin/outreach/OutreachTypeMix';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { OutreachSummaryDto } from '@/lib/api/types';

export function OutreachOverview({
    summary,
    isLoading,
    error,
    onOpenAction,
}: {
    summary: OutreachSummaryDto | null;
    isLoading: boolean;
    error: unknown;
    onOpenAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.outreach');
    const toErrorMessage = useApiErrorMessage();

    if (isLoading) return <LoadingState label={t('loading')} className="justify-start py-6" />;
    if (error) return <p className="py-6 text-sm text-status-danger">{toErrorMessage(error)}</p>;
    if (!summary) return null;

    return (
        <div className="space-y-5">
            {/* Summary */}
            <OutreachSummaryStrip summary={summary} />

            {/* Funnel and status mix */}
            <div className="grid gap-5 lg:grid-cols-2">
                <OutreachFunnel summary={summary} />
                <OutreachTypeMix byType={summary.byType} />
            </div>

            {/* Cities and follow-ups */}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <OutreachCitySplit byCity={summary.byCity} />
                <OutreachDueList rows={summary.dueSoon} onOpenAction={onOpenAction} />
            </div>
        </div>
    );
}
