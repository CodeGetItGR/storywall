'use client';

import { useMemo } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventBilling } from '@/hooks/useBilling';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { featureAddonMode, featureAddonOffers } from '@/lib/featureAddons';
import { premiumTiles } from '@/lib/feedModuleTiles';
import { type InvitationDocument, MAX_SECTIONS } from '@/lib/invitation/document';
import { scopedPlans } from '@/lib/planTiers';

const NO_MODULES: EventDetailResponseDto['modules'] = [];

// The Premium tiles for this event: its modules, and what its plan sells as add-ons (set per plan in the admin Paid
// services console). Billing is closed to co-hosts (403), so they see only the tiles that add (Open question 11).
// enabled: the sheet is open, so billing is read only then.
export function useFeedModuleTiles(document: InvitationDocument, event: Pick<EventDetailResponseDto, 'id' | 'modules'>, enabled: boolean) {
    const appConfig = useAppConfig();
    const billing = useEventBilling(event.id, enabled);
    const modules = event.modules ?? NO_MODULES;

    return useMemo(() => {
        const plan = scopedPlans(appConfig.data?.planTiers ?? [], 'EVENT').find((item) => item.code === billing.data?.planTierCode) ?? null;
        const offers = billing.data
            ? featureAddonOffers({
                  paidServices: appConfig.data?.paidServices ?? [],
                  platformModules: appConfig.data?.modules ?? [],
                  plan,
                  eventModules: modules,
                  ownedAddons: billing.data.addons ?? [],
                  mode: featureAddonMode(billing.data.eventStatus),
              })
            : [];
        return premiumTiles({ document, modules, offers, canAdd: document.sections.length < MAX_SECTIONS });
    }, [appConfig.data, billing.data, document, modules]);
}
