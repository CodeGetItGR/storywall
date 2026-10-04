import { formatAdminDateTime } from '@/lib/adminWithdrawals';
import { endpoints } from '@/lib/api/endpoints';
import type {
    AdminOrderCommissionDto,
    AdminOrderDetailDto,
    AdminOrderWithdrawalDto,
    BuyerType,
    OrderKind,
    OrderStatus,
    PaymentProviderKey,
} from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export const ORDERS_HASH_ROOT = '#orders';

export function isOrdersHash(hash: string): boolean {
    return hash === ORDERS_HASH_ROOT || hash.startsWith(`${ORDERS_HASH_ROOT}/`);
}

// `#orders/<orderId>` opens that order's page; the bare root is the list.
export function parseOrdersHash(hash: string): string | null {
    if (!isOrdersHash(hash)) return null;
    const rest = hash.slice(ORDERS_HASH_ROOT.length + 1);
    if (!rest) return null;
    try {
        return decodeURIComponent(rest);
    } catch {
        return null;
    }
}

export function formatOrdersHash(orderId: string | null): string {
    return orderId ? `${ORDERS_HASH_ROOT}/${encodeURIComponent(orderId)}` : ORDERS_HASH_ROOT;
}

export const ORDER_STATUSES: OrderStatus[] = ['PAID', 'PENDING', 'REFUNDED', 'FAILED', 'CANCELLED'];
export const ORDER_KINDS: OrderKind[] = ['ACTIVATION', 'UPGRADE', 'EXTENSION', 'STORAGE_PACK'];
export const BUYER_TYPES: BuyerType[] = ['CONSUMER', 'BUSINESS'];
export const PAYMENT_PROVIDERS: PaymentProviderKey[] = ['STRIPE', 'MANUAL'];

// The server refuses a longer search with 400.
export const ORDER_QUERY_MAX_LENGTH = 200;
export const ORDERS_PAGE_SIZE = 50;

export type AdminOrderFilters = {
    status: OrderStatus | null;
    kind: OrderKind | null;
    buyerType: BuyerType | null;
    provider: PaymentProviderKey | null;
    // YYYY-MM-DD, the days the order was placed, both inclusive (Athens time on the server).
    from: string;
    to: string;
    disputeOpen: boolean | null;
    comp: boolean | null;
    buyerId: string | null;
    q: string;
};

export const EMPTY_ORDER_FILTERS: AdminOrderFilters = {
    status: null,
    kind: null,
    buyerType: null,
    provider: null,
    from: '',
    to: '',
    disputeOpen: null,
    comp: null,
    buyerId: null,
    q: '',
};

// The server answers 400 to a range that ends before it starts; the list waits instead.
export function isOrderRangeInvalid({ from, to }: { from: string; to: string }): boolean {
    return Boolean(from && to && to < from);
}

export function hasOrderFilters(filters: AdminOrderFilters): boolean {
    return (Object.keys(EMPTY_ORDER_FILTERS) as (keyof AdminOrderFilters)[]).some((key) => filters[key] !== EMPTY_ORDER_FILTERS[key]);
}

// Filters the operator chose beyond status, kind, dates and search — counted on the "More filters" toggle.
export function countMoreFilters(filters: AdminOrderFilters): number {
    return [filters.buyerType, filters.provider, filters.disputeOpen, filters.comp].filter((value) => value !== null).length;
}

export function adminOrdersPath(filters: AdminOrderFilters, page: number, size: number): string {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (filters.status) params.set('status', filters.status);
    if (filters.kind) params.set('kind', filters.kind);
    if (filters.buyerType) params.set('buyerType', filters.buyerType);
    if (filters.provider) params.set('provider', filters.provider);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.disputeOpen !== null) params.set('disputeOpen', String(filters.disputeOpen));
    if (filters.comp !== null) params.set('comp', String(filters.comp));
    if (filters.buyerId) params.set('buyerId', filters.buyerId);
    const q = filters.q.trim();
    if (q) params.set('q', q);
    return `${endpoints.admin.orders.list}?${params.toString()}`;
}

function isoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

// The accountant works month by month: the export defaults to the last full calendar month.
export function lastMonthRange(today: Date): { from: string; to: string } {
    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastOfPrevious = new Date(firstOfThisMonth.getFullYear(), firstOfThisMonth.getMonth(), 0);
    const firstOfPrevious = new Date(lastOfPrevious.getFullYear(), lastOfPrevious.getMonth(), 1);
    return { from: isoDate(firstOfPrevious), to: isoDate(lastOfPrevious) };
}

// The export's range limit; past it the server answers 400.
export const ACCOUNTING_EXPORT_MAX_DAYS = 366;

export function accountingExportRangeError({ from, to }: { from: string; to: string }): 'missing' | 'order' | 'tooLong' | null {
    if (!from || !to) return 'missing';
    if (to < from) return 'order';
    const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
    return days > ACCOUNTING_EXPORT_MAX_DAYS ? 'tooLong' : null;
}

export function attachmentFilename(contentDisposition: string | null, fallback: string): string {
    const match = /filename="?([^";]+)"?/i.exec(contentDisposition ?? '');
    return match?.[1]?.trim() || fallback;
}

export function stripePaymentUrl(providerPaymentId: string): string {
    return `https://dashboard.stripe.com/payments/${encodeURIComponent(providerPaymentId)}`;
}

// The business details the order was sold under, in the order they are shown.
export const BUSINESS_SNAPSHOT_FIELDS = [
    'legalName',
    'vatNumber',
    'countryCode',
    'addressLine1',
    'addressLine2',
    'city',
    'postalCode',
    'viesStatus',
    'viesCheckedAt',
] as const;

export type BusinessSnapshotField = (typeof BUSINESS_SNAPSHOT_FIELDS)[number];

export function businessSnapshotEntries(snapshot: Record<string, unknown>): { key: BusinessSnapshotField; value: string }[] {
    return BUSINESS_SNAPSHOT_FIELDS.filter((key) => snapshot[key] !== null && snapshot[key] !== undefined && snapshot[key] !== '').map((key) => ({
        key,
        value: String(snapshot[key]),
    }));
}

// A paid order is dated by its payment; one never paid, by when it was placed.
export function orderDisplayDate(order: { paidAt: string | null; createdAt: string }): string {
    return order.paidAt ?? order.createdAt;
}

const BOOLEAN_FILTERS = new Set<keyof AdminOrderFilters>(['disputeOpen', 'comp']);
const TEXT_FILTERS = new Set<keyof AdminOrderFilters>(['from', 'to', 'q']);

// A filter input's value as the filter holds it: '' is "any", booleans arrive as 'true'/'false'.
export function filterValueFromInput(name: keyof AdminOrderFilters, value: string): AdminOrderFilters[keyof AdminOrderFilters] {
    if (TEXT_FILTERS.has(name)) return value;
    if (value === '') return null;
    if (BOOLEAN_FILTERS.has(name)) return value === 'true';
    return value as AdminOrderFilters[keyof AdminOrderFilters];
}

export function formatOptionalDateTime(locale: string, value: string | null): string | null {
    return value ? formatAdminDateTime(locale, value) : null;
}

export function formatAdminDate(locale: string, value: string): string {
    return formatDate(locale, value, { dateStyle: 'medium' }) || value;
}

// What the order bought, by code: the plan, or the storage pack for a pack order.
export function orderPurchaseCode(order: AdminOrderDetailDto): string | null {
    return order.coverage.planCode ?? order.coverage.paidServiceCode ?? order.summary.planCode;
}

export type OrderActivityItem =
    | { kind: 'placed'; at: string }
    | { kind: 'paid'; at: string; settledBy: string | null }
    | { kind: 'disputeOpened'; at: string }
    | { kind: 'disputeClosed'; at: string }
    | { kind: 'refunded'; at: string; refund: NonNullable<AdminOrderDetailDto['refund']> }
    | { kind: 'withdrawal'; at: string; withdrawal: AdminOrderWithdrawalDto }
    | { kind: 'commission'; at: string; commission: AdminOrderCommissionDto };

// Everything that happened to the order, oldest first. Events at the same instant
// keep the order they are listed in here (placed before paid).
export function orderActivity(order: AdminOrderDetailDto): OrderActivityItem[] {
    const { summary, payment, refund, settledBy } = order;
    const items: OrderActivityItem[] = [{ kind: 'placed', at: summary.createdAt }];
    if (summary.paidAt) items.push({ kind: 'paid', at: summary.paidAt, settledBy: settledBy ? (settledBy.name ?? settledBy.email) : null });
    if (payment.disputedAt) items.push({ kind: 'disputeOpened', at: payment.disputedAt });
    if (payment.disputeClosedAt) items.push({ kind: 'disputeClosed', at: payment.disputeClosedAt });
    if (refund) items.push({ kind: 'refunded', at: refund.refundedAt, refund });
    for (const withdrawal of order.withdrawals) items.push({ kind: 'withdrawal', at: withdrawal.createdAt, withdrawal });
    for (const commission of order.commissions) items.push({ kind: 'commission', at: commission.createdAt, commission });
    return items.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
