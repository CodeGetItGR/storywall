'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { eventKeys } from '@/hooks/useEvent';
import { useGiftAccount } from '@/hooks/useGiftAccount';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

// What the feed's cover block needs: the glow once the page has loaded, one refetch of the event when
// its theme illustration fails, and the gift button when the event has a gift account.
export function useFeedCoverBlock(event: EventDetailResponseDto, wishlist: boolean) {
    const eventId = event.id;
    const illustrationUrl = event.theme?.illustrationUrl ?? null;
    const queryClient = useQueryClient();
    const gifts = useGiftAccount(eventId);
    const giftName = useModuleCopy(event.eventType)('wishlist').name;
    // An admin replacing a preset's art can leave the event's illustration URL dead; refetch once per URL.
    const refetchedIllustration = useRef<string | null>(null);
    const [pageLoaded, setPageLoaded] = useState(false);

    useEffect(() => {
        const markLoaded = () => setPageLoaded(true);

        if (document.readyState === 'complete') {
            markLoaded();
            return;
        }

        window.addEventListener('load', markLoaded, { once: true });
        return () => window.removeEventListener('load', markLoaded);
    }, []);

    const onIllustrationError = useCallback(() => {
        if (!illustrationUrl || refetchedIllustration.current === illustrationUrl) return;
        refetchedIllustration.current = illustrationUrl;
        void queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    }, [eventId, illustrationUrl, queryClient]);

    const showsGift = wishlist && !gifts.isLoading && Boolean(gifts.data);
    return { pageLoaded, onIllustrationError, giftHref: showsGift ? routes.events.tools.gifts(eventId) : null, giftName };
}
