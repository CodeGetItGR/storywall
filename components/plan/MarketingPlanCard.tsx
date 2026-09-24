'use client';

import { type ReactNode, useId } from 'react';

import { DurationPicker } from '@/components/plan/DurationPicker';
import { PlanCardExpandToggle } from '@/components/plan/PlanCardExpandToggle';
import { PlanCardPopularBadge } from '@/components/plan/PlanCardPopularBadge';
import { PlanCardSelectionLabel } from '@/components/plan/PlanCardSelectionLabel';
import { useDisclosure } from '@/hooks/useDisclosure';
import { type LandingPlan, pickedLandingDuration } from '@/lib/landingPricing';
import { cn } from '@/lib/utils';

type MarketingPlanCardProps = {
    featured: boolean;
    plan: LandingPlan;
    popularLabel: string;
    durationLabel: string;
    expandLabel: string;
    collapseLabel: string;
    // Whether the feature list starts open on mobile. Desktop always shows it.
    defaultExpanded?: boolean;
    // The duration picked on this card; the plan's default until one is.
    durationId?: string | null;
    onDurationChangeAction?: (planCode: string, optionId: string) => void;
    selected?: boolean;
    selectionLabel?: string;
    onSelectAction?: (planCode: string) => void;
    footer?: ReactNode;
};

export function MarketingPlanCard({
    featured,
    plan,
    popularLabel,
    durationLabel,
    expandLabel,
    collapseLabel,
    defaultExpanded = false,
    durationId,
    onDurationChangeAction,
    selected = false,
    selectionLabel,
    onSelectAction,
    footer,
}: MarketingPlanCardProps) {
    const duration = pickedLandingDuration(plan, durationId);
    const { open, toggle } = useDisclosure(defaultExpanded);
    const durationLabelId = useId();
    const featuresId = useId();
    const selectable = Boolean(onSelectAction);

    function handleSelect() {
        onSelectAction?.(plan.code);
    }

    function handleDurationChange(optionId: string) {
        onDurationChangeAction?.(plan.code, optionId);
    }

    const cardClassName = cn(
        'group @container relative flex h-full w-full flex-col justify-between rounded-[22px] border px-5 pt-5 pb-5 text-left text-[#151313] transition-colors',
        {
            // Landing: the coral outline marks the featured plan.
            'border-transparent': !selectable && !featured,
            'border-[#f29380]': !selectable && featured,
            // Plan step: only the selected plan gets a strong outline.
            'border-[#151313]/15 hover:border-[#151313]/35': selectable && !selected,
            'border-[#151313] bg-[#fff9f6] ring-1 ring-[#151313]': selected,
        },
    );

    const content = (
        <>
            {/* Select plan: stretched over the whole card; only the duration picker, expand arrow and footer sit above it */}
            {onSelectAction && (
                <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={plan.name}
                    onClick={handleSelect}
                    className="absolute inset-0 z-1 rounded-[22px] focus-ring focus-visible:outline-offset-2"
                />
            )}

            <div>
                {/* Popular */}
                <PlanCardPopularBadge label={featured ? popularLabel : null} />

                {/* Plan identity: name and price scale with the card so they fit side by side; the price drops below only on very narrow cards */}
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 className="text-[clamp(18px,7cqi,28px)] leading-[1.05] font-black tracking-[.09em]">{plan.name}</h3>
                    <p className="bg-[linear-gradient(110deg,#d889a0,#e98778_28%,#f39a63_58%,#f5b967)] bg-clip-text pr-[.06em] font-[Baskerville,Georgia,serif] text-[clamp(36px,16.5cqi,64px)] leading-[1.1] tracking-[-.06em] text-transparent">
                        {duration.price}
                    </p>
                </div>
                <p className="mt-1 text-sm text-[#151313]/65">
                    {plan.audience} · {plan.storage}
                </p>

                {/* Duration */}
                <p id={durationLabelId} className="mt-5 text-sm font-semibold">
                    {durationLabel}
                </p>
                <DurationPicker
                    options={plan.durations}
                    value={duration.id}
                    onChangeAction={handleDurationChange}
                    variant="marketing"
                    labelledBy={durationLabelId}
                    className="relative z-10 mb-3"
                />

                {/* Plan features: collapsible on mobile, always shown on desktop */}
                <ul id={featuresId} className={cn('mb-0 list-none p-0', !open && 'hidden min-[761px]:block')}>
                    {plan.features.map((feature, index) => (
                        <li
                            className="relative border-b border-[#151313]/10 py-2.75 pr-1 pl-6 text-[13px] leading-[1.4] before:absolute before:top-2.75 before:left-0 before:content-['✓'] min-[761px]:text-sm"
                            key={`${plan.name}-${feature}`}
                        >
                            <span
                                className={cn(
                                    index === 0 && plan.includedFeatures ? 'font-bold' : '',
                                    featured && index > 0 && index < plan.features.length - 1 ? 'font-bold' : '',
                                )}
                            >
                                {feature}
                            </span>
                            {index === 0 && plan.includedFeatures && (
                                <span className="mt-1 block text-[12px] leading-[1.55] text-[#151313]/70">({plan.includedFeatures.join(' · ')})</span>
                            )}
                        </li>
                    ))}
                </ul>

                {/* Expand (mobile only) */}
                <PlanCardExpandToggle
                    open={open}
                    controlsId={featuresId}
                    expandLabel={expandLabel}
                    collapseLabel={collapseLabel}
                    onToggleAction={toggle}
                />
            </div>

            {/* Selection and footer */}
            <div>
                {selectionLabel && <PlanCardSelectionLabel label={selectionLabel} selected={selected} />}
                {footer && <div className="relative z-10">{footer}</div>}
            </div>
        </>
    );

    if (onSelectAction) return <div className={cardClassName}>{content}</div>;

    return <article className={cardClassName}>{content}</article>;
}
