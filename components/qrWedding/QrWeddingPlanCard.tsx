'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { LandingPricingCta } from '@/components/landing/LandingPricingCta';
import { type LandingPlan, pickedLandingDuration } from '@/lib/landingPricing';
import { cn } from '@/lib/utils';

type QrWeddingPlanCardProps = {
    plan: LandingPlan;
    featured: boolean;
    // The wedding type's slug, for the button's link.
    eventType: string;
    durationId: string | undefined;
    onDurationChangeAction: (planCode: string, optionId: string) => void;
    // The button text, and the duration switch's name for this plan.
    chooseLabel: string;
    durationGroupLabel: string;
};

const FEATURE =
    'flex gap-3.5 border-b border-[#eee] py-3 text-[15px] leading-[1.45] max-[1051px]:text-[13px] max-[781px]:text-[15px] max-[601px]:text-sm';
const CHECK = <span className="flex-[0_0_14px]">✓</span>;

// One package in the page's editorial style: name and price, audience, a duration switch, its features
// and a button to create the wedding on it.
export function QrWeddingPlanCard({
    plan,
    featured,
    eventType,
    durationId,
    onDurationChangeAction,
    chooseLabel,
    durationGroupLabel,
}: QrWeddingPlanCardProps) {
    const t = useTranslations('LandingPage.pricing');
    const months = useTranslations('Durations');
    const duration = pickedLandingDuration(plan, durationId);
    const singleDuration = plan.durations.length === 1;

    function handleDuration(event: MouseEvent<HTMLButtonElement>) {
        onDurationChangeAction(plan.code, event.currentTarget.value);
    }

    return (
        <article
            className={cn(
                'relative flex min-h-180 flex-col text-[#151313] max-[901px]:min-h-0',
                featured
                    ? "rounded-3xl border border-[#f48d80] bg-transparent px-5.5 pt-6.5 pb-5.5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[22px] before:bg-[linear-gradient(135deg,#e77f9d_0%,#f29b72_52%,#f4c45f_100%)] before:p-px before:content-[''] before:[mask:linear-gradient(#fff_0_0)_content-box_exclude,linear-gradient(#fff_0_0)] max-[1001px]:px-5 max-[1001px]:pt-5 max-[761px]:before:rounded-[18px]"
                    : 'rounded-[26px] border border-transparent bg-white pt-11 pb-6 max-[781px]:rounded-[23px] max-[781px]:border-[#eee] max-[781px]:px-5 max-[781px]:py-6.75 max-[601px]:px-4.5 max-[601px]:pt-8 max-[601px]:pb-5.5 max-[361px]:px-3.5',
            )}
        >
            {/* Popular */}
            {featured && (
                <span className="absolute top-4 left-5.5 rounded-[18px] bg-[#f9e8e5] px-3 py-1.25 font-[Arial,sans-serif] text-xs leading-[normal] font-bold">
                    {t('popular')}
                </span>
            )}

            {/* Name and price */}
            <div className="relative flex min-h-23 w-full items-center justify-between gap-3.5 max-[901px]:min-w-0 max-[601px]:min-h-20.5 max-[601px]:gap-2.5">
                <h3
                    className={cn(
                        'm-0 font-[Arial,sans-serif] text-[clamp(23px,2.1vw,30px)] font-extrabold tracking-[0.045em] uppercase max-[1051px]:text-[22px] max-[781px]:text-[25px] max-[601px]:text-[clamp(23px,6vw,28px)]',
                        featured && 'pr-35 max-[761px]:pr-30',
                    )}
                >
                    {plan.name}
                </h3>
                <div className="flex min-w-0 flex-none flex-col items-end justify-center self-center text-right">
                    <div className="font-[Georgia,serif] text-[clamp(45px,4vw,66px)] leading-[1.03] tracking-[-0.055em] text-[#ec8e7e] max-[1051px]:text-[43px] max-[781px]:text-[53px] max-[601px]:text-[clamp(42px,11vw,53px)]">
                        {duration.price}
                    </div>
                    {duration.listPrice && (
                        <p className="m-0 mt-1.25 font-[Baskerville,Georgia,serif] text-[19px] leading-[1.2] text-[#9a9a9a] max-[601px]:text-base">
                            <s>
                                <span className="sr-only">{t('listPrice')} </span>
                                {duration.listPrice}
                            </s>
                        </p>
                    )}
                </div>
            </div>

            {/* Audience */}
            <p className="mt-2.25 mb-5.25 font-[Arial,sans-serif] text-[15px] text-[#888]">
                {plan.audience} · {plan.storage}
            </p>

            {/* Duration */}
            {singleDuration ? (
                <p className="mb-7 font-[Arial,sans-serif] text-[15px] leading-[1.4] font-bold">{t('durationSingle', { count: duration.months })}</p>
            ) : (
                <>
                    <p className="mb-4 min-h-10.5 font-[Arial,sans-serif] text-[15px] leading-[1.4] font-bold max-[781px]:min-h-0">
                        {t('durationLabel')}
                    </p>
                    <div aria-label={durationGroupLabel} className="mb-7 flex gap-5.5" role="group">
                        {plan.durations.map((option) => {
                            const active = option.id === duration.id;
                            return (
                                <button
                                    aria-pressed={active}
                                    className={cn(
                                        'cursor-pointer border-b-3 pb-1.75 font-[Arial,sans-serif] text-[15px]',
                                        active ? 'border-[#ee9589] font-bold text-[#151313]' : 'border-transparent font-medium text-[#888]',
                                    )}
                                    key={option.id}
                                    onClick={handleDuration}
                                    type="button"
                                    value={option.id}
                                >
                                    {months('months', { count: option.months })}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Features */}
            <ul className="m-0 mb-6.5 flex-1 list-none p-0 font-[Arial,sans-serif]">
                {plan.features.map((feature, index) =>
                    index === 0 && plan.includedFeatures ? (
                        <li className={FEATURE} key={feature}>
                            {CHECK}
                            <div>
                                <strong className="font-bold">{feature}</strong>
                                <p className="m-0 mt-1.75 text-[13px] leading-[1.55] text-[#888]">
                                    {plan.includedFeatures.map((included, line) => (
                                        <span key={included}>
                                            {line > 0 && <br />}
                                            {included}
                                        </span>
                                    ))}
                                </p>
                            </div>
                        </li>
                    ) : (
                        <li className={FEATURE} key={feature}>
                            {CHECK}
                            <span>{feature}</span>
                        </li>
                    ),
                )}
            </ul>

            {/* Choose */}
            <LandingPricingCta
                className="mt-auto flex min-h-14 w-full px-6 py-0 text-sm leading-[normal] font-bold tracking-[0.035em] hover:-translate-y-px max-[601px]:min-h-13.5 max-[601px]:text-[13px] min-[761px]:px-6 min-[761px]:text-sm min-[761px]:tracking-[0.035em]"
                durationId={durationId}
                eventType={eventType}
                label={chooseLabel}
                plan={plan}
                plain
            />
        </article>
    );
}
