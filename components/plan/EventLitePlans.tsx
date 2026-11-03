'use client';

import { useTranslations } from 'next-intl';

import { LitePlansTeaser } from '@/components/plan/LitePlansTeaser';
import { MarketingPlanCard } from '@/components/plan/MarketingPlanCard';
import { useLitePlansOpen } from '@/hooks/useLitePlansOpen';
import type { MarketingPlanOption } from '@/hooks/useMarketingPlanOptions';
import type { PlanTierResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// A narrower grid than the full plans', so the lite cards come out smaller.
const LITE_WIDTH: Record<number, string> = { 1: 'max-w-80', 2: 'max-w-160', 3: 'max-w-250' };
const LITE_COLUMNS: Record<number, string> = { 1: '', 2: 'min-[761px]:grid-cols-2', 3: 'min-[761px]:grid-cols-3' };

type EventLitePlansProps = {
    options: MarketingPlanOption[];
    price: string;
    // All the offered plans, to tell whether the selected one is lite.
    plans: PlanTierResponseDto[];
    selectedCode: string;
    durationPicks: Record<string, string>;
    selectedLabel: string;
    onSelectAction: (code: string) => void;
    onSelectDurationAction: (code: string, optionId: string) => void;
    className?: string;
};

// The creation picker's teaser line and lite plans. Mount it once the plans are known: it starts open
// when the selected plan is a lite one.
export function EventLitePlans({
    options,
    price,
    plans,
    selectedCode,
    durationPicks,
    selectedLabel,
    onSelectAction,
    onSelectDurationAction,
    className,
}: EventLitePlansProps) {
    const tPricing = useTranslations('LandingPage.pricing');
    const { open, toggle } = useLitePlansOpen(plans, selectedCode);
    const count = Math.min(options.length, 3);

    return (
        <LitePlansTeaser className={className} label={tPricing('liteTeaser', { price })} onToggleAction={toggle} open={open}>
            {/* Lite plan cards */}
            <div className={cn('mx-auto grid gap-5 min-[761px]:gap-6', LITE_WIDTH[count], LITE_COLUMNS[count])}>
                {options.map(({ config, presentation }) => (
                    <MarketingPlanCard
                        collapseLabel={tPricing('hideFeatures')}
                        durationId={durationPicks[config.code]}
                        durationLabel={tPricing('durationLabel')}
                        expandLabel={tPricing('showFeatures')}
                        featured={false}
                        key={config.id}
                        listPriceLabel={tPricing('listPrice')}
                        onDurationChangeAction={onSelectDurationAction}
                        onSelectAction={onSelectAction}
                        plan={presentation}
                        popularLabel={tPricing('popular')}
                        selected={selectedCode === config.code}
                        selectionLabel={selectedCode === config.code ? selectedLabel : tPricing('choose')}
                    />
                ))}
            </div>
        </LitePlansTeaser>
    );
}
