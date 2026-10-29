import type { Locale } from '@/i18n/config';
import type { AppConfigResponseDto, EventTypeConvention } from '@/lib/api/types';
import { resolveLandingCategoryPlans } from '@/lib/landingCategories';
import { liveInitialOptions } from '@/lib/planTiers';

// Values for an occasion's length sentences ({lengths, select, …} in its copy): 'single' when every plan
// is sold for the same months, 'span' for two or more, 'none' without config or without a plan on sale.
// months lists the lengths ("3 or 6"); monthCount is the single length, for plurals. extendable is
// 'yes' only while a plan sells coverage extensions.
export type OccasionLengthValues = {
    lengths: 'span' | 'single' | 'none';
    months: string;
    monthCount: number;
    extendable: 'yes' | 'no';
};

// The lengths the occasion's pricing section sells, across every plan.
export function occasionLengthValues(config: AppConfigResponseDto | null, eventType: EventTypeConvention, locale: Locale): OccasionLengthValues {
    if (!config) return { lengths: 'none', months: '', monthCount: 0, extendable: 'no' };
    const { plans } = resolveLandingCategoryPlans(config.planTiers, [eventType], config.memberRolesByEventType);
    const months = [...new Set(plans.flatMap((plan) => liveInitialOptions(plan).map((option) => option.months)))].toSorted(
        (left, right) => left - right,
    );
    const extendable = plans.some((plan) => plan.extensionOptions.some((option) => option.active)) ? 'yes' : 'no';
    return {
        lengths: months.length === 0 ? 'none' : months.length === 1 ? 'single' : 'span',
        months: new Intl.ListFormat(locale, { type: 'disjunction' }).format(months.map(String)),
        monthCount: months.length === 1 ? months[0] : 0,
        extendable,
    };
}
