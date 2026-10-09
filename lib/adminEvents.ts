import { endpoints } from '@/lib/api/endpoints';
import type {
    AdminEventCloseRequestDto,
    AdminEventDetailDto,
    AdminEventSummaryDto,
    AdminEventSuspendRequestDto,
    EventStatus,
    GuidelinesRule,
    OperationalCloseReason,
    StatementGround,
} from '@/lib/api/types';
import { isExplanationValid, trimLikeBackend } from '@/lib/guidelinesRules';

export const EVENTS_HASH_ROOT = '#events';

export function isEventsHash(hash: string): boolean {
    return hash === EVENTS_HASH_ROOT || hash.startsWith(`${EVENTS_HASH_ROOT}/`);
}

// `#events/<eventId>` opens that event's page; the bare root is the list.
export function parseEventsHash(hash: string): string | null {
    if (!isEventsHash(hash)) return null;
    const rest = hash.slice(EVENTS_HASH_ROOT.length + 1);
    if (!rest) return null;
    try {
        return decodeURIComponent(rest);
    } catch {
        return null;
    }
}

export function formatEventsHash(eventId: string | null): string {
    return eventId ? `${EVENTS_HASH_ROOT}/${encodeURIComponent(eventId)}` : EVENTS_HASH_ROOT;
}

export const EVENT_STATUSES: EventStatus[] = ['ACTIVE', 'DRAFT'];
export const OPERATIONAL_CLOSE_REASONS: OperationalCloseReason[] = ['HOST_REQUEST', 'DUPLICATE', 'PAYMENT_ISSUE', 'OTHER'];

// The server refuses longer values with 400.
export const EVENT_QUERY_MAX_LENGTH = 200;
export const PLAN_CODE_MAX_LENGTH = 50;
export const GRANT_REASON_MAX_LENGTH = 500;
export const NOTE_MAX_LENGTH = 2000;
export const MAX_EXTRA_MEMBER_SLOTS = 100_000;
export const EVENTS_PAGE_SIZE = 50;

// Where an event stands for an admin: closed wins over suspended, which wins over deleted.
export type AdminEventState = 'CLOSED' | 'SUSPENDED' | 'DELETED' | EventStatus;

export function adminEventState(event: Pick<AdminEventSummaryDto, 'status' | 'suspendedAt' | 'closedAt' | 'deletedAt'>): AdminEventState {
    if (event.closedAt) return 'CLOSED';
    if (event.suspendedAt) return 'SUSPENDED';
    if (event.deletedAt) return 'DELETED';
    return event.status;
}

export function adminEventDetailState(event: AdminEventDetailDto): AdminEventState {
    return adminEventState({
        status: event.status,
        suspendedAt: event.suspension?.suspendedAt ?? null,
        closedAt: event.suspension?.closedAt ?? null,
        deletedAt: event.deletedAt,
    });
}

// '' is "any" for the selects; the restriction select maps onto the server's suspended/closed flags.
export type EventRestrictionFilter = '' | 'SUSPENDED' | 'NOT_SUSPENDED' | 'CLOSED';

export type AdminEventFilters = {
    status: EventStatus | null;
    planCode: string;
    restriction: EventRestrictionFilter;
    includeDeleted: boolean;
    hostUserId: string | null;
    q: string;
};

export const EMPTY_EVENT_FILTERS: AdminEventFilters = {
    status: null,
    planCode: '',
    restriction: '',
    includeDeleted: false,
    hostUserId: null,
    q: '',
};

export function hasEventFilters(filters: AdminEventFilters): boolean {
    return (Object.keys(EMPTY_EVENT_FILTERS) as (keyof AdminEventFilters)[]).some((key) => filters[key] !== EMPTY_EVENT_FILTERS[key]);
}

export function adminEventsPath(filters: AdminEventFilters, page: number, size: number): string {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (filters.status) params.set('status', filters.status);
    const planCode = filters.planCode.trim();
    if (planCode) params.set('planCode', planCode);
    if (filters.restriction === 'SUSPENDED') params.set('suspended', 'true');
    if (filters.restriction === 'NOT_SUSPENDED') params.set('suspended', 'false');
    if (filters.restriction === 'CLOSED') params.set('closed', 'true');
    if (filters.includeDeleted) params.set('includeDeleted', 'true');
    if (filters.hostUserId) params.set('hostUserId', filters.hostUserId);
    const q = filters.q.trim();
    if (q) params.set('q', q);
    return `${endpoints.admin.events.list}?${params.toString()}`;
}

// Storage is entered in GB, as the plans are shown (1 GB = 1024³ bytes, as formatBytes reads it).
const BYTES_PER_GB = 1024 ** 3;
// The server's ceiling: 10 TiB.
export const MAX_GRANTED_STORAGE_BYTES = 10 * 1024 ** 4;

export function bytesToGb(bytes: number): number {
    return Math.round((bytes / BYTES_PER_GB) * 100) / 100;
}

// null for anything the server would refuse: not a number, negative, or over 10 TiB.
export function gbToBytes(value: string): number | null {
    const text = value.trim().replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(text)) return null;
    const bytes = Math.round(Number(text) * BYTES_PER_GB);
    return bytes <= MAX_GRANTED_STORAGE_BYTES ? bytes : null;
}

// null for anything but a whole number from 0 to the server's ceiling.
export function parseMemberSlots(value: string): number | null {
    const text = value.trim();
    if (!/^\d+$/.test(text)) return null;
    const slots = Number(text);
    return slots <= MAX_EXTRA_MEMBER_SLOTS ? slots : null;
}

export function isGrantReasonValid(reason: string): boolean {
    const length = reason.trim().length;
    return length > 0 && length <= GRANT_REASON_MAX_LENGTH;
}

// The limit a storage grant would leave: null when the plan is unlimited.
export function storageLimitWithGrant(usage: AdminEventDetailDto['usage'], grantedBytes: number): number | null {
    if (usage.planStorageBytes === null) return null;
    return usage.planStorageBytes + usage.purchasedExtraStorageBytes + grantedBytes;
}

// The server refuses a lower grant that would leave the event holding more than its limit (5154).
export function isStorageGrantBelowUsage(usage: AdminEventDetailDto['usage'], grantedBytes: number): boolean {
    const limit = storageLimitWithGrant(usage, grantedBytes);
    return limit !== null && grantedBytes < usage.grantedStorageBytes && usage.storageBytes > limit;
}

export function memberLimitWithSlots(usage: AdminEventDetailDto['usage'], slots: number): number | null {
    return usage.planMaxMembers === null ? null : usage.planMaxMembers + slots;
}

export type CloseKind = 'POLICY' | 'OPERATIONAL';

export type RestrictionDraft = {
    ground: StatementGround | null;
    rule: GuidelinesRule | null;
    operationalReason: OperationalCloseReason | null;
    explanation: string;
    note: string;
};

export const EMPTY_RESTRICTION_DRAFT: RestrictionDraft = {
    ground: 'GUIDELINES_BREACH',
    rule: null,
    operationalReason: null,
    explanation: '',
    note: '',
};

function noteOrNull(note: string): string | null {
    const text = note.trim();
    return text ? text : null;
}

export function suspendRequest(draft: RestrictionDraft): AdminEventSuspendRequestDto | null {
    if (!draft.ground || !draft.rule || !isExplanationValid(draft.explanation)) return null;
    return { ground: draft.ground, rule: draft.rule, explanation: trimLikeBackend(draft.explanation), note: noteOrNull(draft.note) };
}

// Exactly one kind of reason goes out, as the server requires (3039 otherwise).
export function closeRequest(kind: CloseKind, draft: RestrictionDraft): AdminEventCloseRequestDto | null {
    if (!isExplanationValid(draft.explanation)) return null;
    const explanation = trimLikeBackend(draft.explanation);
    const note = noteOrNull(draft.note);
    if (kind === 'POLICY') {
        if (!draft.ground || !draft.rule) return null;
        return { ground: draft.ground, rule: draft.rule, operationalReason: null, explanation, note };
    }
    if (!draft.operationalReason) return null;
    return { ground: null, rule: null, operationalReason: draft.operationalReason, explanation, note };
}

export type EventModuleRow = AdminEventDetailDto['modules'][number] & {
    grant: AdminEventDetailDto['moduleGrants'][number] | null;
};

// Each module with the admin grant behind it, if any. A grant can sit under a plan or bought
// unlock that already covers the module (the source names the first that applies), so it is
// looked up by key rather than read off the source.
export function eventModuleRows(event: Pick<AdminEventDetailDto, 'modules' | 'moduleGrants'>): EventModuleRow[] {
    const grants = new Map(event.moduleGrants.map((grant) => [grant.moduleKey, grant]));
    return event.modules.map((module) => ({ ...module, grant: grants.get(module.moduleKey) ?? null }));
}

// Used over limit as a 0–1 share for the meters; 0 when the limit is unlimited.
export function usageRatio(used: number, limit: number | null): number {
    if (limit === null || limit <= 0) return 0;
    return used / limit;
}
