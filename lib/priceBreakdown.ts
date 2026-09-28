import type {
    EventBillingResponseDto,
    OrderKind,
    OrderSummaryDto,
    PriceBreakdownDiscount,
    PriceBreakdownItem,
    WithdrawalLine,
    WithdrawalPreviewResponseDto,
    WithdrawalResponseDto,
} from '@/lib/api/types';

const DAY_SECONDS = 86_400;

// Why a withdrawal line pays back what it does: in full, or the unused share of
// its time (as whole days). `days` is null when the backend sent no times.
export function withdrawalLineReason(line: Pick<WithdrawalLine, 'basis' | 'usedSeconds' | 'totalSeconds'>) {
    if (line.basis === 'NO_CONSENT_FULL_REFUND') return { full: true, days: null };
    if (line.usedSeconds === null || !line.totalSeconds) return { full: false, days: null };
    return {
        full: false,
        days: { used: Math.ceil(line.usedSeconds / DAY_SECONDS), total: Math.round(line.totalSeconds / DAY_SECONDS) },
    };
}

// The backend's `labelKey`s (withdrawal-compliance-phase4 §3), mapped onto this
// app's PriceBreakdown.items messages. An unknown key falls back to item.name.
const ITEM_LABEL_KEYS: Record<string, string> = {
    'billing.item.activation': 'activation',
    'billing.item.eventDay': 'eventDay',
    'billing.item.coverage': 'coverage',
    'billing.item.upgrade.setup': 'upgradeSetup',
    'billing.item.upgrade.eventDay': 'upgradeEventDay',
    'billing.item.upgrade.coverage': 'upgradeCoverage',
    'billing.item.addon': 'addon',
    'billing.item.storagePack': 'storagePack',
    'billing.item.coverageExtension': 'coverageExtension',
};

export function breakdownItemMessageKey(labelKey: string): string | null {
    return ITEM_LABEL_KEYS[labelKey] ?? null;
}

// `{added}` is " (+N)" when the upgrade adds months, else empty: a same-length
// upgrade shows no "(+0)".
export function breakdownAddedSuffix(monthsAdded: number | null): string {
    return monthsAdded !== null && monthsAdded > 0 ? ` (+${monthsAdded})` : '';
}

// Values for the placeholders every item label may use. `monthsText` is the
// already-localized "{months} month(s)" string, or empty when the item has none.
export function breakdownItemLabelValues(item: PriceBreakdownItem, monthsText: string) {
    return { plan: item.name, name: item.name, monthsText, added: breakdownAddedSuffix(item.monthsAdded) };
}

// A discount without a label reads as "discount code −N%" / "plan promotion −N%".
export function breakdownDiscountMessageKey(discount: PriceBreakdownDiscount): string {
    return discount.label && discount.label.trim() ? discount.source : `${discount.source}_unnamed`;
}

// The order kinds the per-order withdrawal endpoints take. ACTIVATION goes
// through the event endpoint instead (and withdraws the whole event).
const ORDER_SCOPED_KINDS: readonly OrderKind[] = ['UPGRADE', 'STORAGE_PACK', 'EXTENSION'];

export function isOrderScopedWithdrawalKind(kind: OrderKind): boolean {
    return ORDER_SCOPED_KINDS.includes(kind);
}

export function isWithdrawableKind(kind: OrderKind): boolean {
    return kind === 'ACTIVATION' || isOrderScopedWithdrawalKind(kind);
}

/**
 * Whether "Withdraw" belongs on this order (phase 4 §6): a PAID order whose
 * breakdown says the right is available and the window is still open. Returns
 * null for an order with no breakdown (before V106): only its withdrawal
 * preview can say.
 */
export function orderWithdrawalWindowOpen(order: OrderSummaryDto, now: Date = new Date()): boolean | null {
    if (order.status !== 'PAID' || !isWithdrawableKind(order.kind)) return false;
    if (order.buyerType === 'BUSINESS') return false;
    if (!order.breakdown) return null;
    const { available, windowClosesAt } = order.breakdown.withdrawal;
    if (!available || !windowClosesAt) return false;
    return now.getTime() < new Date(windowClosesAt).getTime();
}

// A preview still inside its window (used for orders with no breakdown).
export function previewWindowOpen(preview: Pick<WithdrawalPreviewResponseDto, 'eligible' | 'windowClosesAt'>, now: Date = new Date()): boolean {
    return preview.eligible && Boolean(preview.windowClosesAt) && now.getTime() < new Date(preview.windowClosesAt!).getTime();
}

/**
 * The orders that get a "Withdraw" action: from their breakdown, or, for an
 * order with none, from its preview (keyed by order id). An order whose preview
 * hasn't loaded yet gets no action until it has.
 */
export function withdrawableOrderIds(
    orders: OrderSummaryDto[],
    legacyPreviews: ReadonlyMap<string, Pick<WithdrawalPreviewResponseDto, 'eligible' | 'windowClosesAt'>>,
    now: Date = new Date(),
): Set<string> {
    const ids = new Set<string>();
    for (const order of orders) {
        const open = orderWithdrawalWindowOpen(order, now);
        const preview = legacyPreviews.get(order.id);
        if (open === true || (open === null && preview && previewWindowOpen(preview, now))) ids.add(order.id);
    }
    return ids;
}

/**
 * Purchases a HELD withdrawal blocks until it is decided (phase 2 §9): a whole-event
 * request blocks upgrades and storage packs; a request for an upgrade blocks upgrades.
 * A held storage-pack request blocks nothing.
 */
export function withdrawalPurchaseBlocks(
    withdrawals: WithdrawalResponseDto[] | undefined,
    orders: EventBillingResponseDto['orders'] | undefined,
): { upgradeBlocked: boolean; storageBlocked: boolean } {
    const held = (withdrawals ?? []).filter((withdrawal) => withdrawal.status === 'HELD');
    const eventHeld = held.some((withdrawal) => withdrawal.scope === 'EVENT');
    const upgradeHeld = held.some(
        (withdrawal) => withdrawal.scope === 'ORDER' && (orders ?? []).some((order) => order.id === withdrawal.orderId && order.kind === 'UPGRADE'),
    );
    return { upgradeBlocked: eventHeld || upgradeHeld, storageBlocked: eventHeld };
}

// What a history row says beyond its status: the order it named, whether the
// event-day share was kept, and which lines paid nothing back (a chargeback).
export function withdrawalHistoryFacts(withdrawal: WithdrawalResponseDto) {
    return {
        orderKind: withdrawal.lines.find((line) => line.orderId === withdrawal.orderId)?.orderKind ?? null,
        keptEventDay: withdrawal.lines.some((line) => line.keepEventDay),
        alreadyRefundedLines: withdrawal.lines.filter((line) => isAlreadyRefundedLine(line, withdrawal.status)),
    };
}

// A released line that paid nothing back because its order had already been
// refunded another way (a chargeback). Not money still to come.
export function isAlreadyRefundedLine(line: { refundMinor: number; providerRefunded: boolean }, status: WithdrawalResponseDto['status']): boolean {
    return status === 'REFUNDED' && line.refundMinor === 0 && !line.providerRefunded;
}
