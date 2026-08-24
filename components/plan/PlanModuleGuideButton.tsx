'use client';

import { CircleHelp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

type PlanModuleGuideButtonProps = {
    onOpenAction: (event: MouseEvent<HTMLButtonElement>) => void;
    planCode?: string;
};

export function PlanModuleGuideButton({ onOpenAction, planCode }: PlanModuleGuideButtonProps) {
    const t = useTranslations('EventPlanSettingsPage');

    return (
        <button
            type="button"
            data-plan-code={planCode}
            onClick={onOpenAction}
            aria-label={t('compare.moduleLegendOpen')}
            title={t('compare.moduleLegendOpen')}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background text-ink-faint transition-colors hover:border-border hover:text-ink"
        >
            <CircleHelp className="h-3.5 w-3.5" />
        </button>
    );
}
