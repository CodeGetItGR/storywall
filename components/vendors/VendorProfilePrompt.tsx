'use client';

import { VendorProfileSheet } from '@/components/vendors/VendorProfileSheet';
import { useVendorProfilePrompt } from '@/hooks/useVendorProfilePrompt';

// The first-join sheet on the event feed.
export function VendorProfilePrompt({ eventId }: { eventId: string }) {
    const prompt = useVendorProfilePrompt(eventId);
    if (!prompt.open) return null;
    return <VendorProfileSheet open profile={prompt.profile} defaultType={prompt.defaultType} onCloseAction={prompt.close} />;
}
