'use client';

import { Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { PlanTierResponseDto, PlatformEventTypeResponseDto } from '@/lib/api/types';

// Plans created together by "Duplicate" share a key; the chip lists the other
// event types in that group and jumps to them.
export function PlanSharedGroupChip({
    plan,
    allPlans,
    eventTypes,
    onSelectEventTypeAction,
}: {
    plan: PlanTierResponseDto;
    allPlans: PlanTierResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    onSelectEventTypeAction: (key: string) => void;
}) {
    const t = useTranslations('AdminPage.plans');
    const localizedText = useLocalizedText();

    if (!plan.sharedGroupKey) return null;
    const siblings = allPlans.filter((other) => other.sharedGroupKey === plan.sharedGroupKey && other.id !== plan.id && other.eventTypeKey);
    if (siblings.length === 0) return null;

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const key = event.currentTarget.dataset.eventTypeKey;
        if (key) onSelectEventTypeAction(key);
    }

    return (
        <span className="inline-flex flex-wrap items-center gap-1 text-[11px] text-ink-faint">
            <Link2 className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">{t('sharedGroup.label')}</span>
            {siblings.map((sibling) => {
                const type = eventTypes.find((item) => item.eventTypeKey === sibling.eventTypeKey);
                return (
                    <button
                        key={sibling.id}
                        type="button"
                        data-event-type-key={sibling.eventTypeKey ?? ''}
                        onClick={handleClick}
                        className="rounded-full bg-status-neutral-wash px-1.5 py-0.5 font-bold text-status-neutral hover:text-ink"
                    >
                        {type ? localizedText(type.name, type.eventTypeKey) : sibling.eventTypeKey}
                    </button>
                );
            })}
        </span>
    );
}
