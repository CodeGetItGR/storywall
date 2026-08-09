'use client';

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
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/70 bg-background text-[10px] font-semibold leading-none text-ink-faint transition-colors hover:border-border hover:text-ink"
        >
            ?
        </button>
    );
}
