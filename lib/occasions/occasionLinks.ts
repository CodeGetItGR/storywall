import { eventTypeSlug } from '@/lib/eventTypeSlug';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import type { Occasion } from '@/lib/occasions/occasions';
import { routes } from '@/lib/routes';

// Every create link on an occasion page opens the wizard on that type, with the campaign's code.
export function occasionCreateHref(occasion: Occasion, campaign: OccasionCampaign | null): string {
    return routes.events.new({ type: eventTypeSlug(occasion.eventType), code: campaign?.discountCode ?? null });
}
