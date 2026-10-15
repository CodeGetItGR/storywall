import type { OrderSummaryDto } from '@/lib/api/types';

// The Google Ads tag. Set only on the production deployment, so local and
// preview builds never send data to the Ads account.
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || null;

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
