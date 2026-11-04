import type {
    CheckoutRequestDto,
    CheckoutResponseDto,
    CoverageOptionResponseDto,
    EventStatus,
    OrderSummaryDto,
    PartnerBrandingNoticeDto,
    PlanTierResponseDto,
} from '@/lib/api/types';
import { dateTimeFormat, numberFormat } from '@/lib/format';

type PendingCheckout = {
    orderId: string;
    planTierCode?: string;
};

function pendingCheckoutKey(eventId: string): string {
    return `storywall.pendingCheckout.${eventId}`;
}

export function formatMoney(locale: string, minor: number, currency: string | null): string {
    return formatOptionalMoney(minor, currency, locale) ?? '0.00';
}

export function formatOptionalMoney(minor: number | null, currency: string | null, locale?: string): string | null {
    if (minor === null) return null;

    const value = minor / 100;
    if (!currency) return value.toFixed(2);

    try {
        return numberFormat(locale, { style: 'currency', currency }).format(value);
    } catch {
        return `${value.toFixed(2)} ${currency}`;
    }
}

// windowClosesAt is the first instant withdrawal is no longer possible, so the
// last moment a host can still withdraw is one second before it.
export function lastWithdrawalMoment(windowClosesAt: string): Date {
    return new Date(new Date(windowClosesAt).getTime() - 1000);
}

export function formatBillingDate(locale: string, value: string | null): string | null {
    return value ? dateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value)) : null;
}

export function checkoutSuccessUrl(origin: string, eventId: string, orderId: string, planTierCode?: string | null): string {
    const params = new URLSearchParams({ orderId });
    if (planTierCode) params.set('planTierCode', planTierCode);
    return `${origin}/events/${eventId}/checkout/success?${params.toString()}`;
}

export function rememberPendingCheckout(eventId: string, orderId: string, planTierCode?: string | null): void {
    if (typeof window === 'undefined') return;

    const pending: PendingCheckout = { orderId };
    if (planTierCode) pending.planTierCode = planTierCode;
    window.sessionStorage.setItem(pendingCheckoutKey(eventId), JSON.stringify(pending));
}

export function readPendingCheckout(eventId: string): PendingCheckout | null {
    if (typeof window === 'undefined') return null;

    const value = window.sessionStorage.getItem(pendingCheckoutKey(eventId));
    if (!value) return null;

    try {
        const pending = JSON.parse(value) as Partial<PendingCheckout>;
        return typeof pending.orderId === 'string'
            ? { orderId: pending.orderId, ...(typeof pending.planTierCode === 'string' ? { planTierCode: pending.planTierCode } : {}) }
            : null;
    } catch {
        return null;
    }
}

export function clearPendingCheckout(eventId: string): void {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(pendingCheckoutKey(eventId));
}

export function navigateToCheckout(eventId: string, checkout: CheckoutResponseDto, planTierCode?: string | null): void {
    rememberPendingCheckout(eventId, checkout.orderId, planTierCode);
    const destination = checkout.redirectUrl.includes('/checkout/success')
        ? checkoutSuccessUrl(window.location.origin, eventId, checkout.orderId, planTierCode)
        : checkout.redirectUrl;
    window.location.assign(destination);
}

export function newestBillingOrder(orders: OrderSummaryDto[], kind?: OrderSummaryDto['kind']): OrderSummaryDto | null {
    const scoped = kind ? orders.filter((order) => order.kind === kind) : orders;
    return [...scoped].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;
}

// On a gift event, an order another host paid comes back with no amounts: it
// reads as "Gift" and can't be withdrawn by the reader (4010). On other events a
// false paidByCaller (orders with no recorded buyer) hides nothing.
export function isOrderPaidByAnother(order: Pick<OrderSummaryDto, 'paidByCaller' | 'amountMinor'>): boolean {
    return order.paidByCaller === false && order.amountMinor === null;
}

// Null when another host paid one of the orders (a gift event): a partial sum
// would read as the event's total.
export function paidBillingTotal(orders: OrderSummaryDto[]): number | null {
    const paid = orders.filter((order) => order.status === 'PAID');
    if (paid.some(isOrderPaidByAnother)) return null;
    return paid.reduce((sum, order) => sum + (order.amountMinor ?? 0), 0);
}

export function billingCurrency(orders: OrderSummaryDto[], fallback = 'EUR'): string {
    return (
        orders.find((order) => order.status === 'PAID' && order.currency)?.currency ?? orders.find((order) => order.currency)?.currency ?? fallback
    );
}

// Whether the plan's promotion window covers `now`. The dates govern the plan's
// percent and every duration's promo price alike; a null bound is open.
export function isPlanPromotionOpen(plan: PlanTierResponseDto, now = new Date()): boolean {
    const startsAt = parseDiscountBoundary(plan.discountStartsAt);
    if (startsAt && startsAt.getTime() > now.getTime()) return false;

    const endsAt = parseDiscountBoundary(plan.discountEndsAt);
    return !endsAt || endsAt.getTime() > now.getTime();
}

export function isPlanDiscountActive(plan: PlanTierResponseDto, now = new Date()): boolean {
    if (!plan.discountPercent || plan.discountPercent <= 0) return false;
    return isPlanPromotionOpen(plan, now);
}

// Whether the discount campaign this plan carries covers `now`. The catalog is cached, so the
// browser checks the dates itself.
export function isCampaignDiscountLive(plan: PlanTierResponseDto, now = new Date()): boolean {
    if (!plan.campaignDiscountPercent || plan.campaignDiscountPercent <= 0) return false;
    const startsAt = parseDiscountBoundary(plan.campaignDiscountStartsAt ?? null);
    const endsAt = parseDiscountBoundary(plan.campaignDiscountEndsAt ?? null);
    if (!startsAt || !endsAt) return false;
    return startsAt.getTime() <= now.getTime() && endsAt.getTime() > now.getTime();
}

// The next moment after `now` (epoch ms) when a campaign carried by one of the plans starts or ends,
// null when there is none. Prices change then, so a screen that is already open must redraw.
export function nextCampaignBoundary(plans: PlanTierResponseDto[], now = new Date()): number | null {
    let next: number | null = null;
    for (const plan of plans) {
        if (!plan.campaignDiscountPercent || plan.campaignDiscountPercent <= 0) continue;
        for (const boundary of [plan.campaignDiscountStartsAt, plan.campaignDiscountEndsAt]) {
            const moment = parseDiscountBoundary(boundary ?? null)?.getTime();
            if (moment !== undefined && moment > now.getTime() && (next === null || moment < next)) next = moment;
        }
    }
    return next;
}

// The discount is truncated, never the price, as the server does
// (CollaborationPricing.applyDiscount): 12.5% off 999 takes 124, not 125. The percent carries at
// most two decimals, so it is worked in hundredths to keep the arithmetic exact.
function percentOffMinor(amountMinor: number, percent: number): number {
    const hundredths = Math.round(Math.min(Math.max(percent, 0), 100) * 100);
    return Math.max(0, amountMinor - Math.floor((amountMinor * hundredths) / 10_000));
}

export type PromotedLine = { amountMinor: number; discountActive: boolean; discountLabel: string | null };

// The lower of the plan's own price and the campaign's, as PlanPromotionResolver does on the server.
// A tie keeps the plan's own, and the two never add up.
function promotedLine(listMinor: number, ownMinor: number, ownActive: boolean, plan: PlanTierResponseDto, now: Date): PromotedLine {
    if (isCampaignDiscountLive(plan, now)) {
        const campaignMinor = percentOffMinor(listMinor, plan.campaignDiscountPercent ?? 0);
        if (campaignMinor < ownMinor) {
            return { amountMinor: campaignMinor, discountActive: true, discountLabel: plan.campaignDiscountLabel ?? null };
        }
    }
    return { amountMinor: ownMinor, discountActive: ownActive, discountLabel: plan.discountLabel };
}

// An amount after the best of the plan's percent and the campaign.
export function promotedAmount(listMinor: number, plan: PlanTierResponseDto, now = new Date()): PromotedLine {
    const ownActive = isPlanDiscountActive(plan, now);
    const ownMinor = ownActive ? percentOffMinor(listMinor, plan.discountPercent ?? 0) : listMinor;
    return promotedLine(listMinor, ownMinor, ownActive, plan, now);
}

// The duration's promo price while the plan's promotion window is open, else null.
export function activePromoPriceMinor(option: CoverageOptionResponseDto, plan: PlanTierResponseDto, now = new Date()): number | null {
    if (option.kind !== 'INITIAL' || option.promoPriceAmountMinor === null) return null;
    return isPlanPromotionOpen(plan, now) ? option.promoPriceAmountMinor : null;
}

// One duration's price: its live promo price (which replaces the plan's percent), else the percent,
// and in both cases the campaign when that is lower.
export function promotedOption(option: CoverageOptionResponseDto, plan: PlanTierResponseDto, now = new Date()): PromotedLine {
    const promoMinor = activePromoPriceMinor(option, plan, now);
    return promoMinor !== null
        ? promotedLine(option.priceAmountMinor, promoMinor, true, plan, now)
        : promotedAmount(option.priceAmountMinor, plan, now);
}

export function discountedAmountMinor(amountMinor: number, plan: PlanTierResponseDto, now = new Date()): number {
    return promotedAmount(amountMinor, plan, now).amountMinor;
}

export function promotedOptionAmountMinor(option: CoverageOptionResponseDto, plan: PlanTierResponseDto, now = new Date()): number {
    return promotedOption(option, plan, now).amountMinor;
}

function parseDiscountBoundary(value: string | null): Date | null {
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

// The billing section `?section=` targets for the coverage-ending notification's CTA.
export const EXTEND_COVERAGE_SECTION_ID = 'extend-coverage';

// Only the main host of a live event whose coverage has not ended can buy more
// months (coverage-options-and-extensions-fe-integration.md §11). Whether the plan
// sells any extension is the server's answer, checked separately.
export function canExtendCoverage({
    isPrimaryHost,
    eventStatus,
    coverageEndsAt,
    now = new Date(),
}: {
    isPrimaryHost: boolean;
    eventStatus: EventStatus | null;
    coverageEndsAt: string | null;
    now?: Date;
}): boolean {
    if (!isPrimaryHost || eventStatus !== 'ACTIVE' || !coverageEndsAt) return false;
    return new Date(coverageEndsAt).getTime() > now.getTime();
}

// A branded partner's code needs the couple's acceptance of the notice the preview carried;
// without a notice the fields are left out.
export function partnerBrandingCheckoutFields(
    notice: PartnerBrandingNoticeDto | null,
    accepted: boolean,
): Pick<CheckoutRequestDto, 'acceptsPartnerBranding' | 'partnerBrandingNoticeVersion'> {
    if (!notice) return {};
    return { acceptsPartnerBranding: accepted, partnerBrandingNoticeVersion: notice.noticeVersion };
}
