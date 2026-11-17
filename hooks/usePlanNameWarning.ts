import { useTranslations } from 'next-intl';

import { PLAN_NAME_CARD_FIT_LENGTH, planNameMayWrapPrice } from '@/lib/adminPlanForm';

// The warning under an admin plan name field, or undefined while the name still fits beside the price on a plan card.
export function usePlanNameWarning(name: string): string | undefined {
    const t = useTranslations('AdminPage');
    return planNameMayWrapPrice(name) ? t('fields.nameLengthWarning', { count: PLAN_NAME_CARD_FIT_LENGTH }) : undefined;
}
