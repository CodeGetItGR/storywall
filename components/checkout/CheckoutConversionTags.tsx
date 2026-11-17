'use client';

import { GoogleTag } from '@/components/consent/GoogleTag';
import { MetaPixel } from '@/components/consent/MetaPixel';
import { useAuth } from '@/hooks/useAuth';
import type { OrderSummaryDto } from '@/lib/api/types';

type CheckoutConversionTagsProps = {
    // The paid order, once known.
    purchase: OrderSummaryDto | null;
};

// The ad tags that report a purchase, each only with the visitor's consent.
// Meta also gets the signed-in host's email to match the purchase to an ad.
export function CheckoutConversionTags({ purchase }: CheckoutConversionTagsProps) {
    const { user, isBootstrapping } = useAuth();

    return (
        <>
            <GoogleTag purchase={purchase} />
            <MetaPixel purchase={purchase} email={isBootstrapping ? undefined : (user?.email ?? null)} />
        </>
    );
}
