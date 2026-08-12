'use client';

import { CircleHelp } from 'lucide-react';
import { useTranslations } from 'next-intl';

type PlanModuleGuideButtonProps = {
    onOpen: () => void;
};

export function PlanModuleGuideButton({ onOpen }: PlanModuleGuideButtonProps) {
    const t = useTranslations('EventPlanSettingsPage');

    return (
        <button
            type="button"
            onClick={onOpen}
            aria-label={t('compare.moduleLegendOpen')}
            title={t('compare.moduleLegendOpen')}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background text-ink-faint transition-colors hover:border-border hover:text-ink"
        >
            <CircleHelp className="h-3.5 w-3.5" />
        </button>
    );
}
