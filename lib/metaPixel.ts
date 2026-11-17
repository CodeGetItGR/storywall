import type { OrderSummaryDto } from '@/lib/api/types';

// The Meta Pixel. Set only on the production deployment, so local and preview
// builds never send data to the Meta ad account.
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || null;

export const META_PIXEL_SCRIPT_URL = 'https://connect.facebook.net/en_US/fbevents.js';

type Fbq = ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void;
    queue: unknown[];
    push: Fbq;
    loaded: boolean;
    version: string;
    disablePushState?: boolean;
};

declare global {
    interface Window {
        fbq?: Fbq;
        _fbq?: Fbq;
    }
}

export type MetaPixelPurchase = Pick<OrderSummaryDto, 'id' | 'amountMinor' | 'currency'>;

// Pixel ids already initialised on each fbq instance, so a re-render or a
// change of mind never initialises one twice.
const initialisedIds = new WeakMap<Fbq, Set<string>>();

// The queue fbevents.js reads once it loads: Meta's own snippet, minus the
// script tag, which next/script adds.
export function ensureMetaPixel(): void {
    if (window.fbq) return;

    const fbq = ((...args: unknown[]) => {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue.push(args);
    }) as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    // Page views are sent by hand, once per path. Without this the pixel also
    // sends one on every in-app navigation, including signed-in pages.
    fbq.disablePushState = true;
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
}

// The email is matched by Meta to its own accounts; the pixel hashes it in the
// browser before sending. Meta's automatic setup (button clicks, page
// metadata) stays off so only what is listed here goes out.
export function initMetaPixel(pixelId: string, email: string | null): void {
    const fbq = window.fbq;
    if (!fbq) return;

    const initialised = initialisedIds.get(fbq) ?? new Set<string>();
    if (initialised.has(pixelId)) return;
    initialised.add(pixelId);
    initialisedIds.set(fbq, initialised);

    const matchEmail = email?.trim().toLowerCase();
    fbq('set', 'autoConfig', false, pixelId);
    if (matchEmail) fbq('init', pixelId, { em: matchEmail });
    else fbq('init', pixelId);
}

// A no-op until the pixel has been set up.
export function updateMetaPixelConsent(granted: boolean): void {
    window.fbq?.('consent', granted ? 'grant' : 'revoke');
}

export function trackMetaPixelPageview(): void {
    window.fbq?.('track', 'PageView');
}

// The order id is the event id, so Meta can match it to the same purchase sent
// from the server (KAN-183). No amount (an order another host paid) sends the
// purchase without a value.
export function trackMetaPixelPurchase(purchase: MetaPixelPurchase): void {
    window.fbq?.(
        'track',
        'Purchase',
        purchase.amountMinor !== null ? { value: purchase.amountMinor / 100, currency: purchase.currency ?? 'EUR' } : {},
        { eventID: purchase.id },
    );
}
