import { ApiError } from '@/lib/api/client';
import type {
    OutreachPriority,
    OutreachProspectCreateRequestDto,
    OutreachProspectDto,
    OutreachStatus,
    OutreachStatusCounts,
    OutreachSummaryDto,
    OutreachType,
    PartnerRole,
} from '@/lib/api/types';

export const OUTREACH_PAGE_SIZE = 50;
export const OUTREACH_NAME_MAX = 200;
export const OUTREACH_EMAIL_SUBJECT_MAX = 300;
export const OUTREACH_EMAIL_BODY_MAX = 5000;
export const OUTREACH_NOTE_MAX = 4000;
export const OUTREACH_TEXT_MAX = 100;
export const OUTREACH_SENDER_PLACEHOLDER = '{{sender_name}}';
export const OUTREACH_TIME_ZONE = 'Europe/Athens';
// Today's cities. City is free text, so the add form only suggests these.
export const OUTREACH_CITY_SUGGESTIONS = ['Athens', 'Thessaloniki'] as const;

// Pipeline order.
export const OUTREACH_STATUSES: readonly OutreachStatus[] = [
    'NEW',
    'EMAILED',
    'FOLLOWED_UP',
    'REPLIED',
    'MEETING',
    'PARTNER',
    'DECLINED',
    'NO_RESPONSE',
];
const ACTIVE_STATUSES: ReadonlySet<OutreachStatus> = new Set(['EMAILED', 'FOLLOWED_UP', 'REPLIED', 'MEETING']);
export const OUTREACH_TYPES: readonly OutreachType[] = ['VENUES', 'PLANNERS', 'PHOTO_VIDEO', 'SHOPS_DECOR'];
export const OUTREACH_PRIORITIES: readonly OutreachPriority[] = ['A', 'B', 'C'];
export const OUTREACH_KINDS: readonly PartnerRole[] = [
    'VENUE',
    'PLANNER',
    'PHOTOGRAPHER',
    'VIDEOGRAPHER',
    'DECORATION',
    'CATERING',
    'MUSIC',
    'OTHER',
];

export function isActiveOutreachStatus(status: OutreachStatus): boolean {
    return ACTIVE_STATUSES.has(status);
}

// One colour per status, from the console's semantic status set. `bar` fills the charts.
export const OUTREACH_STATUS_TONE: Record<OutreachStatus, { pill: string; bar: string }> = {
    NEW: { pill: 'bg-status-neutral-wash text-status-neutral', bar: 'bg-status-neutral' },
    EMAILED: { pill: 'bg-status-info-wash text-status-info', bar: 'bg-status-info' },
    FOLLOWED_UP: { pill: 'bg-status-warn-wash text-status-warn', bar: 'bg-status-warn' },
    REPLIED: { pill: 'bg-status-violet-wash text-status-violet', bar: 'bg-status-violet' },
    MEETING: { pill: 'bg-status-teal-wash text-status-teal', bar: 'bg-status-teal' },
    PARTNER: { pill: 'bg-status-good-wash text-status-good', bar: 'bg-status-good' },
    DECLINED: { pill: 'bg-status-danger-wash text-status-danger', bar: 'bg-status-danger' },
    NO_RESPONSE: { pill: 'bg-surface-muted text-ink-faint', bar: 'bg-line-strong' },
};

// --- Next step and tips ---

const NEXT_STATUS: Partial<Record<OutreachStatus, OutreachStatus>> = {
    NEW: 'EMAILED',
    EMAILED: 'FOLLOWED_UP',
    FOLLOWED_UP: 'REPLIED',
    REPLIED: 'MEETING',
    MEETING: 'PARTNER',
};

// The one primary step for a business, or null once it has an outcome. Other moves use the status select.
export function nextOutreachStatus(status: OutreachStatus): OutreachStatus | null {
    return NEXT_STATUS[status] ?? null;
}

export type OutreachTipKey = 'new' | 'waiting' | 'waitingNoDate' | 'replied' | 'meeting' | 'partner' | 'closed';

// What to do now, shown in the drawer. `waiting` names the reminder date.
export function outreachTip(status: OutreachStatus, nextFollowupOn: string | null): OutreachTipKey {
    switch (status) {
        case 'NEW':
            return 'new';
        case 'EMAILED':
        case 'FOLLOWED_UP':
            return nextFollowupOn ? 'waiting' : 'waitingNoDate';
        case 'REPLIED':
            return 'replied';
        case 'MEETING':
            return 'meeting';
        case 'PARTNER':
            return 'partner';
        case 'DECLINED':
        case 'NO_RESPONSE':
            return 'closed';
    }
}

// --- Summary math ---

export function shareOf(count: number, total: number): number | null {
    return total > 0 ? count / total : null;
}

// Replies out of the businesses we contacted.
export function outreachReplyRate(summary: Pick<OutreachSummaryDto, 'replied' | 'contacted'>): number | null {
    return shareOf(summary.replied, summary.contacted);
}

export type OutreachFunnelStepKey = 'researched' | 'contacted' | 'replied' | 'meetings' | 'partners';
export type OutreachFunnelStep = { key: OutreachFunnelStepKey; count: number; share: number | null };

// Each step as a share of every business found.
export function outreachFunnelSteps(summary: OutreachSummaryDto): OutreachFunnelStep[] {
    const counts: [OutreachFunnelStepKey, number][] = [
        ['researched', summary.total],
        ['contacted', summary.contacted],
        ['replied', summary.replied],
        ['meetings', summary.meetings],
        ['partners', summary.partners],
    ];
    return counts.map(([key, count]) => ({ key, count, share: shareOf(count, summary.total) }));
}

export type OutreachStatusSegment = { status: OutreachStatus; count: number; share: number };

// The non-empty statuses of one bar, in pipeline order, as shares of the bar's own total.
export function outreachStatusSegments(byStatus: Partial<OutreachStatusCounts>): OutreachStatusSegment[] {
    const counts = OUTREACH_STATUSES.map((status) => ({ status, count: byStatus[status] ?? 0 }));
    const total = counts.reduce((sum, { count }) => sum + count, 0);
    if (total === 0) return [];
    return counts.filter(({ count }) => count > 0).map(({ status, count }) => ({ status, count, share: count / total }));
}

// The type with the most businesses still to contact, for the chart caption.
export function typeWithMostToContact(byType: OutreachSummaryDto['byType']): { type: OutreachType; count: number } | null {
    let best: { type: OutreachType; count: number } | null = null;
    for (const row of byType) {
        const count = row.byStatus.NEW ?? 0;
        if (count > 0 && (!best || count > best.count)) best = { type: row.type, count };
    }
    return best;
}

export type OutreachCityRow = { city: string; total: number; contacted: number; share: number | null };

// Biggest city first; `share` is how much of that city we have contacted.
export function outreachCityRows(byCity: OutreachSummaryDto['byCity']): OutreachCityRow[] {
    return [...byCity]
        .sort((left, right) => right.total - left.total || left.city.localeCompare(right.city))
        .map((row) => ({ ...row, share: shareOf(row.contacted, row.total) }));
}

// --- Dates (Europe/Athens, 'YYYY-MM-DD') ---

export function todayInAthens(now: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: OUTREACH_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function parseDay(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

// A calendar day, read as written (no time zone shift).
export function formatOutreachDay(locale: string, value: string | null): string | null {
    if (!value) return null;
    const day = parseDay(value);
    if (!day) return value;
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(day);
}

// --- How to reach them ---

export function safeHttpUrl(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const url = new URL(withScheme);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
    } catch {
        return null;
    }
}

// A link as people say it: "example.gr" or "example.gr/contact".
export function linkLabel(value: string): string {
    const href = safeHttpUrl(value);
    if (!href) return value;
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./i, '');
    const path = url.pathname.replace(/\/+$/, '');
    return path ? `${host}${path}` : host;
}

// Instagram arrives as "@handle", "handle" or a profile URL.
export function instagramHandle(value: string): string | null {
    const trimmed = value.trim();
    const fromUrl = /instagram\.com\/([A-Za-z0-9._]+)/i.exec(trimmed);
    const handle = fromUrl ? fromUrl[1] : trimmed.replace(/^@/, '');
    return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : null;
}

export type ReachChannelKey = 'email' | 'phone' | 'website' | 'instagram' | 'contactForm';
export type ReachChannel = { key: ReachChannelKey; label: string; href: string | null; copyText: string };

export function reachChannels(prospect: Pick<OutreachProspectDto, 'email' | 'phone' | 'website' | 'instagram' | 'contactForm'>): ReachChannel[] {
    const channels: ReachChannel[] = [];
    if (prospect.email) channels.push({ key: 'email', label: prospect.email, href: `mailto:${prospect.email}`, copyText: prospect.email });
    if (prospect.phone) {
        channels.push({ key: 'phone', label: prospect.phone, href: `tel:${prospect.phone.replace(/[^\d+]/g, '')}`, copyText: prospect.phone });
    }
    if (prospect.website) {
        channels.push({ key: 'website', label: linkLabel(prospect.website), href: safeHttpUrl(prospect.website), copyText: prospect.website });
    }
    if (prospect.instagram) {
        const handle = instagramHandle(prospect.instagram);
        channels.push({
            key: 'instagram',
            label: handle ? `@${handle}` : prospect.instagram,
            href: handle ? `https://www.instagram.com/${handle}/` : null,
            copyText: handle ? `@${handle}` : prospect.instagram,
        });
    }
    if (prospect.contactForm) {
        channels.push({
            key: 'contactForm',
            label: linkLabel(prospect.contactForm),
            href: safeHttpUrl(prospect.contactForm),
            copyText: prospect.contactForm,
        });
    }
    return channels;
}

// --- Table sort ---

export type OutreachSortField = 'priority' | 'name' | 'kind' | 'city' | 'status' | 'lastContactOn' | 'nextFollowupOn';
export type OutreachSort = { field: OutreachSortField; direction: 'asc' | 'desc' } | null;

// A header click cycles ascending → descending → the default order (priority, then name).
export function toggleOutreachSort(current: OutreachSort, field: OutreachSortField): OutreachSort {
    if (current?.field !== field) return { field, direction: 'asc' };
    if (current.direction === 'asc') return { field, direction: 'desc' };
    return null;
}

export function outreachSortParam(sort: OutreachSort): string | null {
    return sort ? `${sort.field},${sort.direction}` : null;
}

// --- Add a business ---

export interface ProspectDraft {
    name: string;
    kind: PartnerRole | '';
    city: string;
    area: string;
    subcategory: string;
    priority: OutreachPriority;
    website: string;
    email: string;
    phone: string;
    instagram: string;
    contactForm: string;
    contactPerson: string;
    credibility: string;
    fit: string;
}

export const EMPTY_PROSPECT_DRAFT: ProspectDraft = {
    name: '',
    kind: '',
    city: '',
    area: '',
    subcategory: '',
    priority: 'B',
    website: '',
    email: '',
    phone: '',
    instagram: '',
    contactForm: '',
    contactPerson: '',
    credibility: '',
    fit: '',
};

export type ProspectDraftError = 'required' | 'emailInvalid' | 'linkInvalid';
export type ProspectDraftErrors = Partial<Record<keyof ProspectDraft, ProspectDraftError>>;

const LOOSE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isLooseEmail(value: string): boolean {
    return LOOSE_EMAIL.test(value.trim());
}

export function prospectDraftErrors(draft: ProspectDraft): ProspectDraftErrors {
    const errors: ProspectDraftErrors = {};
    if (!draft.name.trim()) errors.name = 'required';
    if (!draft.kind) errors.kind = 'required';
    if (!draft.city.trim()) errors.city = 'required';
    if (draft.email.trim() && !isLooseEmail(draft.email)) errors.email = 'emailInvalid';
    if (draft.website.trim() && !safeHttpUrl(draft.website)) errors.website = 'linkInvalid';
    if (draft.contactForm.trim() && !safeHttpUrl(draft.contactForm)) errors.contactForm = 'linkInvalid';
    return errors;
}

function optional(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

// Links are sent with their scheme, since the server only takes http(s).
export function toProspectCreateRequest(draft: ProspectDraft): OutreachProspectCreateRequestDto {
    return {
        name: draft.name.trim(),
        kind: draft.kind as PartnerRole,
        city: draft.city.trim(),
        area: optional(draft.area),
        subcategory: optional(draft.subcategory),
        priority: draft.priority,
        website: draft.website.trim() ? safeHttpUrl(draft.website) : null,
        email: optional(draft.email),
        phone: optional(draft.phone),
        instagram: optional(draft.instagram),
        contactForm: draft.contactForm.trim() ? safeHttpUrl(draft.contactForm) : null,
        contactPerson: optional(draft.contactPerson),
        credibility: optional(draft.credibility),
        fit: optional(draft.fit),
    };
}

// A 409 on create names the business we already have. The id's field name is read loosely.
export function duplicateProspectId(error: unknown): string | null | undefined {
    if (!(error instanceof ApiError) || error.status !== 409) return undefined;
    const details = (error.problem?.details ?? error.problem ?? {}) as Record<string, unknown>;
    const id = details.existingId ?? details.prospectId ?? details.id;
    return typeof id === 'string' ? id : null;
}
