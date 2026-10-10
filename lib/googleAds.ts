import type { OrderSummaryDto } from '@/lib/api/types';

// The Google Ads tag. Set only on the production deployment, so local and
// preview builds never send data to the Ads account.
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || null;

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
    }
}

export function googleAdsScriptUrl(tagId: string): string {
    return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
}

// Runs before gtag.js loads. The tag only renders after the visitor accepted
// Advertising, so Consent Mode starts granted for ads and denied for analytics.
export function googleAdsInitScript(tagId: string): string {
    return [
        'window.dataLayer = window.dataLayer || [];',
        'function gtag(){dataLayer.push(arguments);}',
        'window.gtag = gtag;',
        "gtag('consent', 'default', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'denied' });",
        "gtag('js', new Date());",
        `gtag('config', ${JSON.stringify(tagId)});`,
    ].join('\n');
}

// The "Purchase" conversion action in the Google Ads account above.
const PURCHASE_CONVERSION_LABEL = '2AceCLvk-ZcdEPye-vdE';

export type GoogleAdsPurchase = Pick<OrderSummaryDto, 'id' | 'amountMinor' | 'currency' | 'firstPurchase'>;

// The order id lets Google drop a repeat of the same order, e.g. on a reload.
// No amount (an order another host paid) sends the conversion without a value,
// and an unknown first purchase sends no new_customer.
export function trackGoogleAdsPurchase(tagId: string, purchase: GoogleAdsPurchase): void {
    window.gtag?.('event', 'conversion', {
        send_to: `${tagId}/${PURCHASE_CONVERSION_LABEL}`,
        transaction_id: purchase.id,
        ...(purchase.amountMinor !== null && { value: purchase.amountMinor / 100, currency: purchase.currency ?? 'EUR' }),
        ...(typeof purchase.firstPurchase === 'boolean' && { new_customer: purchase.firstPurchase }),
    });
}

// For a change of mind within one page view, once gtag.js is already loaded.
export function updateGoogleAdsConsent(granted: boolean): void {
    const value = granted ? 'granted' : 'denied';
    window.gtag?.('consent', 'update', { ad_storage: value, ad_user_data: value, ad_personalization: value });
}
