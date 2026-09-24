import type { ReactNode } from 'react';

import { DurationPicker } from '@/components/plan/DurationPicker';
import { type LandingPlan, pickedLandingDuration } from '@/lib/landingPricing';
import { cn } from '@/lib/utils';

type MarketingPlanCardProps = {
    featured: boolean;
    plan: LandingPlan;
    popularLabel: string;
    storageLabel: string;
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
    storageLabel,
    durationId,
    onDurationChangeAction,
    selected = false,
    selectionLabel,
    onSelectAction,
    footer,
}: MarketingPlanCardProps) {
    const duration = pickedLandingDuration(plan, durationId);

    function handleSelect() {
        onSelectAction?.(plan.code);
    }

    function handleDurationChange(optionId: string) {
        onDurationChangeAction?.(plan.code, optionId);
    }

    const cardClassName = cn(
        'relative flex h-full w-full flex-col justify-between rounded-[22px] border px-5 pt-5 pb-4 text-left text-[#151313] transition-colors min-[761px]:px-5',
        onSelectAction && !selected && 'hover:border-[#151313]/25',
        {
            'border-transparent': !featured && !selected,
            'border-[#f29380]': featured && !selected,
            'border-[#151313]/25 bg-[#fff9f6]': selected,
        },
    );

    const content = (
        <>
            {/* Select plan: stretched over the whole card; only the duration picker and footer sit above it */}
            {onSelectAction && (
                <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={plan.name}
                    onClick={handleSelect}
                    className="absolute inset-0 z-[1] rounded-[22px] focus-ring focus-visible:outline-offset-2"
                />
            )}

            <div>
                {/* Plan identity */}
                <div className="relative min-h-26.5 pr-24">
                    <h3 className="text-[clamp(20px,1.65vw,27px)] leading-[1.05] font-black tracking-[.09em]">
                        {plan.name}
                        <span className="ml-2 inline-block align-middle text-[9px] leading-none font-bold tracking-widest normal-case">
                            {featured ? popularLabel : null}
                        </span>
                    </h3>
                    <p className="mt-1 text-sm text-[#151313]/65">{plan.audience}</p>
                    <p className="mt-1 text-sm text-[#151313]/65">
                        {plan.storage} {storageLabel}
                    </p>
                    <div className="absolute top-0 right-0 bg-[linear-gradient(110deg,#d889a0,#e98778_28%,#f39a63_58%,#f5b967)] bg-clip-text font-[Baskerville,Georgia,serif] text-[clamp(48px,4vw,64px)] tracking-[-.06em] text-transparent">
                        {duration.price}
                    </div>
                </div>

                {/* Duration */}
                <DurationPicker
                    options={plan.durations}
                    value={duration.id}
                    onChangeAction={handleDurationChange}
                    variant="marketing"
                    className="relative z-10 mt-3 mb-2"
                />

                {/* Plan features */}
                <ul className="mb-0 list-none p-0">
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
            </div>

            {/* Selection and footer */}
            <div>
                {selectionLabel && (
                    <p className={cn('mt-4 text-center text-[12px] font-black tracking-[.12em]', selected ? 'text-[#151313]' : 'text-[#151313]/70')}>
                        {selectionLabel}
                    </p>
                )}
                {footer && <div className="relative z-10">{footer}</div>}
            </div>
        </>
    );

    if (onSelectAction) return <div className={cardClassName}>{content}</div>;

    return <article className={cardClassName}>{content}</article>;
}
