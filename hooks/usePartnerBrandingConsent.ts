'use client';

import { type ChangeEvent, useCallback, useState } from 'react';

import type { PartnerBrandingNoticeDto } from '@/lib/api/types';
import { partnerBrandingCheckoutFields } from '@/lib/billing';

function noticeKey(notice: PartnerBrandingNoticeDto): string {
    return `${notice.displayName}\u0000${notice.noticeVersion}`;
}

/**
 * The checkout notice for a branded partner's code. The box is ticked for one
 * notice only: applying another code, or the same code with newer wording,
 * asks again.
 */
export function usePartnerBrandingConsent(notice: PartnerBrandingNoticeDto | null) {
    const [acceptedKey, setAcceptedKey] = useState<string | null>(null);
    const accepted = notice !== null && acceptedKey === noticeKey(notice);

    const handleChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            if (!notice) return;
            setAcceptedKey(event.target.checked ? noticeKey(notice) : null);
        },
        [notice],
    );

    return {
        notice,
        accepted,
        satisfied: notice === null || accepted,
        requestFields: partnerBrandingCheckoutFields(notice, accepted),
        handleChange,
    };
}

export type PartnerBrandingConsent = ReturnType<typeof usePartnerBrandingConsent>;
