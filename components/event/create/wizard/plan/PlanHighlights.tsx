import { CreateEventFeatureIcon } from '@/components/event/create/wizard/CreateEventFeatureIcon';
import type { PlanCardView } from '@/hooks/useCreateEventWizardPlanStep';

// Up to three tiles for what the plan adds.
export function PlanHighlights({ highlights }: { highlights: PlanCardView['highlights'] }) {
    if (highlights.length === 0) return null;
    return (
        <ul className="grid grid-cols-3 gap-2.5">
            {highlights.map((highlight) => (
                <li key={highlight.key} className="flex flex-col items-center gap-2 rounded-[18px] bg-[#fff6f2] px-1.5 py-3 text-center">
                    <CreateEventFeatureIcon featureKey={highlight.key} size="tile" />
                    <span className="text-[13px] font-bold text-ink">{highlight.name}</span>
                </li>
            ))}
        </ul>
    );
}
