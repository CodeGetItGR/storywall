import type { LandingPlan } from '@/lib/landingPricing';
import { cn } from '@/lib/utils';

type MarketingPlanCardProps = {
    featured: boolean;
    photosLabel: string;
    plan: LandingPlan;
    popularLabel: string;
    storageLabel: string;
    storageNote: string;
    videosLabel: string;
    planCode?: string;
    selected?: boolean;
    selectionLabel?: string;
    onSelectAction?: (planCode: string) => void;
};

export function MarketingPlanCard({
    featured,
    photosLabel,
    plan,
    popularLabel,
    storageLabel,
    storageNote,
    videosLabel,
    planCode,
    selected = false,
    selectionLabel,
    onSelectAction,
}: MarketingPlanCardProps) {
    function handleSelect() {
        if (planCode) onSelectAction?.(planCode);
    }

    const cardClassName = cn(
        'flex h-full min-h-155 w-full flex-col justify-between rounded-[22px] border px-5 pt-5 pb-4 text-left text-[#151313] transition-colors min-[761px]:min-h-166.5 min-[761px]:px-5',
        onSelectAction &&
            !selected &&
            'hover:border-[#151313]/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#df7794]',
        {
            'border-transparent': !featured && !selected,
            'border-[#f29380]': featured && !selected,
            'border-[#151313]/25 bg-[#fff9f6]': selected,
        }
    );

    const content = (
        <>
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
                    <div className="absolute top-0 right-0 bg-[linear-gradient(110deg,#d889a0,#e98778_28%,#f39a63_58%,#f5b967)] bg-clip-text font-[Baskerville,Georgia,serif] text-[clamp(48px,4vw,64px)] tracking-[-.06em] text-transparent">
                        {plan.price}
                    </div>
                </div>

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
                                    featured && index > 0 && index < plan.features.length - 1 ? 'font-bold' : ''
                                )}
                            >
                                {feature}
                            </span>
                            {index === 0 && plan.includedFeatures && (
                                <span className="mt-1 block text-[11px] leading-[1.55] text-[#151313]/55">({plan.includedFeatures.join(' · ')})</span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Storage estimate */}
            <div>
                <strong>{plan.storage}</strong> {storageLabel}
                <div className="mt-3 text-sm leading-[1.45]">
                    <strong>~ {plan.photos}</strong> {photosLabel} <span aria-hidden="true">·</span> ~ <strong>{plan.videos}</strong> {videosLabel}
                </div>
                <p className="mt-1 text-[10px] leading-[1.35] italic text-[#151313]/50">{storageNote}</p>
                {selectionLabel && (
                    <p className={cn('mt-4 text-center text-[11px] font-black tracking-[.12em]', selected ? 'text-[#151313]' : 'text-[#151313]/55')}>
                        {selectionLabel}
                    </p>
                )}
            </div>
        </>
    );

    if (onSelectAction) {
        return (
            <button type="button" aria-pressed={selected} className={cardClassName} onClick={handleSelect}>
                {content}
            </button>
        );
    }

    return <article className={cardClassName}>{content}</article>;
}
