import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { PlanHighlights } from '@/components/event/create/wizard/plan/PlanHighlights';
import { DurationPicker } from '@/components/plan/DurationPicker';
import type { PlanCardView } from '@/hooks/useCreateEventWizardPlanStep';

// The selected plan: badge, name and price, what it adds, and how long it stays online.
export function PlanCard({ card, onDurationChange }: { card: PlanCardView; onDurationChange: (optionId: string) => void }) {
    const t = useTranslations('CreateEventPage.wizard.plan');
    const tPricing = useTranslations('LandingPage.pricing');
    const durationLabelId = useId();

    return (
        <div className="relative flex flex-col gap-4.5 rounded-[28px] bg-white px-5 pt-5.5 pb-5 shadow-[0_0_0_2px_#241f1a,0_16px_36px_rgba(36,31,26,0.10)]">
            {/* Badge */}
            {card.isFull && (
                <span className="absolute -top-3.25 left-5 rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] px-3 py-1.25 text-xs font-extrabold text-ink">
                    {t('bestFit')}
                </span>
            )}

            {/* Name and price */}
            <div className="flex items-end justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-[26px] font-extrabold tracking-[0.08em] text-ink">{card.name}</span>
                    <span className="text-sm text-[#6f6257]">{card.summary}</span>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                    <span className="font-editorial text-[44px] leading-none tracking-[-0.04em] text-[#c4472b]">{card.price}</span>
                    {card.listPrice && (
                        <s className="text-sm text-[#6f6257]">
                            <span className="sr-only">{tPricing('listPrice')} </span>
                            {card.listPrice}
                        </s>
                    )}
                </div>
            </div>

            {/* Highlights */}
            {card.highlights.length > 0 && (
                <div className="flex flex-col gap-2.5">
                    {card.previousName && (
                        <span className="text-[13px] font-semibold text-[#6f6257]">{t('everythingInPlus', { plan: card.previousName })}</span>
                    )}
                    <PlanHighlights highlights={card.highlights} />
                </div>
            )}

            {/* Duration */}
            <div className="flex flex-col gap-2">
                <span id={durationLabelId} className="text-[13px] font-semibold text-[#6f6257]">
                    {tPricing('durationLabel')}
                </span>
                <DurationPicker
                    variant="segmented"
                    options={card.durations}
                    value={card.durationId}
                    onChangeAction={onDurationChange}
                    labelledBy={durationLabelId}
                />
            </div>
        </div>
    );
}
