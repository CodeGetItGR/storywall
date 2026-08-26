import type { EventTypeConvention } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';

export type OnboardingStepId = 'welcome' | 'dashboard' | 'venue' | 'invite' | 'tools' | 'done';

export function getOnboardingStepIds(eventType: EventTypeConvention): OnboardingStepId[] {
    const hasSecondaryConvention = Boolean(getCreateEventCatalogEntry(eventType)?.secondarySessionTitleKey);

    const steps: OnboardingStepId[] = ['welcome', 'dashboard'];
    if (hasSecondaryConvention) steps.push('venue');
    steps.push('invite', 'tools', 'done');

    return steps;
}
