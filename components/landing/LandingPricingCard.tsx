import type { LandingPlan } from '@/lib/landingPricing';
import { routes } from '@/lib/routes';

type LandingPricingCardProps = {
    chooseLabel: string;
    featured: boolean;
    photosLabel: string;
    plan: LandingPlan;
    popularLabel: string;
    storageLabel: string;
    storageNote: string;
    videosLabel: string;
};

export function LandingPricingCard({
    chooseLabel,
    featured,
    photosLabel,
    plan,
    popularLabel,
    storageLabel,
    storageNote,
    videosLabel,
}: LandingPricingCardProps) {
    return (
        <article
            className={`flex h-full min-h-[620px] flex-col rounded-[22px] px-5 pt-5 pb-4 text-[#151313] min-[761px]:min-h-[666px] min-[761px]:px-5 ${featured ? 'border border-[#f29380]' : 'border border-transparent'}`}
        >
            {/* Plan identity */}
            <div className="relative min-h-[106px] border-b border-[#151313]/15 pr-24">
                <h3 className="text-[clamp(20px,1.65vw,27px)] leading-[1.05] font-black tracking-[.09em]">
                    {plan.name}
                    <span className="ml-2 inline-block align-middle text-[9px] leading-none font-bold tracking-[.1em] normal-case">
                        {featured ? popularLabel : null}
                    </span>
                </h3>
                <p className="mt-1 text-sm text-[#151313]/65">{plan.audience}</p>
                <div className="absolute top-0 right-0 bg-[linear-gradient(110deg,#d889a0,#e98778_28%,#f39a63_58%,#f5b967)] bg-clip-text [font-family:Baskerville,Georgia,serif] text-[clamp(48px,4vw,64px)] leading-[.85] tracking-[-.06em] text-transparent">
                    {plan.price}
                </div>
            </div>

            {/* Plan features */}
            <ul className="mb-0 list-none p-0">
                {plan.features.map((feature, index) => (
                    <li
                        className="relative border-b border-[#151313]/10 py-[11px] pr-1 pl-6 text-[13px] leading-[1.4] before:absolute before:top-[11px] before:left-0 before:content-['✓'] min-[761px]:text-sm"
                        key={`${plan.name}-${feature}`}
                    >
                        <span
                            className={
                                index === 0 && plan.includedNote
                                    ? 'font-bold'
                                    : featured && index > 0 && index < plan.features.length - 1
                                      ? 'font-bold'
                                      : ''
                            }
                        >
                            {feature}
                        </span>
                        {index === 0 && plan.includedNote ? (
                            <span className="mt-1.5 block text-[11px] leading-[1.45] text-[#151313]/65">({plan.includedNote})</span>
                        ) : null}
                    </li>
                ))}
            </ul>

            {/* Storage */}
            <div className="mt-6 text-sm leading-[1.45]">
                <strong>{plan.storage}</strong> {storageLabel}
                <br />
                <strong>{plan.photos}</strong> {photosLabel} <span aria-hidden="true">·</span> <strong>{plan.videos}</strong> {videosLabel}
            </div>
            <p className="mt-1 text-[10px] leading-[1.35] italic text-[#151313]/50">{storageNote}</p>

            {/* Plan action */}
            <a
                className={`mt-auto flex min-h-12 items-center justify-between rounded-full px-[18px] text-[11px] font-black tracking-[.1em] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e98778] ${featured ? 'bg-[linear-gradient(100deg,#d27b9b,#f4905f_50%,#fcba63)] text-white' : 'border border-[#151313]/25 text-[#151313]'}`}
                href={routes.register}
            >
                <span>{chooseLabel}</span>
                <span aria-hidden="true">→</span>
            </a>
        </article>
    );
}
