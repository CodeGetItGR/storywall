'use client';

import { useBecomePartner } from '@/hooks/useBecomePartner';
import type { VendorMeDto } from '@/lib/api/types';
import { COMING_PARTNER_BENEFITS, partnerBenefits } from '@/lib/vendors';

// The vendor page's partner program: the benefits block, and the one apply sheet that the block and every locked
// preview open. canApply follows the server's prompt flag, which ends once the vendor applied or turned the prompt off.
export function usePartnerBenefits(me: VendorMeDto | null) {
    const sheet = useBecomePartner();
    const partner = me?.approvedPartner ?? false;

    return {
        visible: me !== null,
        partner,
        canApply: !partner && (me?.showPartnerPrompt ?? false),
        benefits: me ? partnerBenefits(me.vendorType) : [],
        coming: COMING_PARTNER_BENEFITS,
        sheet,
    };
}
