import { useTranslations } from 'next-intl';

import { CreateEventFeatureIcon } from '@/components/event/create/wizard/CreateEventFeatureIcon';
import type { BigFeature, SmallFeature } from '@/hooks/useCreateEventWizardTypeStep';

// What the picked type includes: four big features with a line each, a small row, and the plan note.
export function TypeFeatures({ big, small, showPlanNote }: { big: BigFeature[]; small: SmallFeature[]; showPlanNote: boolean }) {
    const t = useTranslations('CreateEventPage.wizard.features');
    if (big.length === 0) return null;

    return (
        <section className="flex flex-col gap-4">
            {/* Heading */}
            <h2 className="text-[15px] font-bold text-[#5a4e44]">{t('heading')}</h2>

            {/* Big four */}
            <ul className="grid grid-cols-2 gap-x-4 gap-y-5">
                {big.map((feature) => (
                    <li key={feature.key} className="flex flex-col gap-1.5">
                        <CreateEventFeatureIcon featureKey={feature.key} size="big" />
                        <span className="text-[15px] leading-tight font-bold text-ink">{feature.name}</span>
                        <span className="text-[13px] leading-snug text-[#6f6257]">{feature.line}</span>
                    </li>
                ))}
            </ul>

            {/* Small row */}
            {small.length > 0 && (
                <ul className="grid auto-cols-fr grid-flow-col gap-1.5 rounded-[20px] bg-[#fff6f2] px-1.5 py-3.5">
                    {small.map((feature) => (
                        <li key={feature.key} className="flex flex-col items-center gap-1.5 text-center">
                            <CreateEventFeatureIcon featureKey={feature.key} size="small" />
                            <span className="text-xs font-semibold text-[#3d342d]">{feature.name}</span>
                        </li>
                    ))}
                </ul>
            )}

            {/* Plan note */}
            {showPlanNote && <p className="text-[13px] leading-snug text-[#6f6257]">{t('planNote')}</p>}
        </section>
    );
}
