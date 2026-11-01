import { endpoints } from '@/lib/api/endpoints';
import type { AdminAuditAction, AdminAuditLogResponseDto } from '@/lib/api/types';

// Every action the server records, in the order the filter lists them (grouped by area).
export const AUDIT_ACTIONS: readonly AdminAuditAction[] = [
    'EVENT_PROVISIONED',
    'EVENT_MODULE_GRANTED',
    'EVENT_MODULE_REVOKED',
    'EVENT_MODULE_CONFIG_SET',
    'EVENT_MODULE_CONFIG_RESET',
    'EVENT_STORAGE_GRANTED',
    'EVENT_MEMBERS_GRANTED',
    'EVENT_BROWSED',
    'EVENT_SUSPENDED',
    'EVENT_SUSPENSION_LIFTED',
    'EVENT_CLOSED',
    'PLAN_MODULES_CHANGED',
    'PLAN_MODULE_CONFIG_CHANGED',
    'CONTENT_VIEWED',
    'CASE_REVIEW_STARTED',
    'CASE_DISMISSED',
    'CASE_RESOLVED',
    'CONTENT_REMOVED',
    'MEMBER_REMOVED',
    'MEMBER_BANNED',
    'BAN_LIFTED',
    'STATEMENT_OF_REASONS_SENT',
    'NOTICE_VIEWED',
    'NOTICE_ATTACHED',
    'NOTICE_CLOSED',
    'ACCOUNT_CREATED',
    'ACCOUNT_STATUS_CHANGED',
    'ACCOUNT_ROLE_CHANGED',
    'ACCOUNT_EMAIL_CHANGED',
    'ACCOUNT_SUSPENDED',
    'ACCOUNT_DELETED',
    'EMAIL_SENT',
    'LANDING_CATEGORY_CREATED',
    'LANDING_CATEGORY_UPDATED',
    'LANDING_CATEGORY_DELETED',
    'LANDING_CATEGORY_EVENT_TYPES_CHANGED',
    'SITE_NOTICE_CREATED',
    'SITE_NOTICE_UPDATED',
    'SITE_NOTICE_DELETED',
    'CAMPAIGN_LINK_CREATED',
    'CAMPAIGN_LINK_RENAMED',
    'CAMPAIGN_LINK_DELETED',
    'APP_REVIEW_UPDATED',
    'OUTREACH_CREATED',
    'OUTREACH_UPDATED',
    'OUTREACH_DELETED',
    'OUTREACH_REQUESTED',
    'OUTREACH_REQUEST_APPROVED',
    'OUTREACH_REQUEST_DECLINED',
    'ADMIN_DEVICE_PAIRED',
    'ADMIN_DEVICE_REVOKED',
];

export function isAuditAction(value: string): value is AdminAuditAction {
    return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

export type AuditTone = 'good' | 'warn' | 'danger' | 'neutral';

// The pill colour of an action: what takes something away is danger, a suspension or a ban
// warn, what adds or turns on good, the rest (views, edits) neutral.
export function auditActionTone(action: AdminAuditAction): AuditTone {
    if (/(_DELETED|_REMOVED|_CLOSED|_REVOKED|_DECLINED)$/.test(action)) return 'danger';
    if (/(SUSPENDED|BANNED)$/.test(action)) return 'warn';
    if (/(_CREATED|_GRANTED|_PROVISIONED|_APPROVED|_LIFTED|_PAIRED)$/.test(action)) return 'good';
    return 'neutral';
}

export const AUDIT_PAGE_SIZE = 50;

export type AuditLogQuery = {
    page: number;
    size?: number;
    adminUserId?: string | null;
    eventId?: string | null;
    action?: AdminAuditAction | null;
};

export const auditLogKeys = {
    all: ['admin', 'audit-log'] as const,
    list: (query: AuditLogQuery) =>
        [...auditLogKeys.all, query.page, query.size ?? AUDIT_PAGE_SIZE, query.adminUserId ?? '', query.eventId ?? '', query.action ?? ''] as const,
};

export function auditLogPath(query: AuditLogQuery): string {
    const params = new URLSearchParams({ page: String(query.page), size: String(query.size ?? AUDIT_PAGE_SIZE) });
    if (query.adminUserId) params.set('adminUserId', query.adminUserId);
    if (query.eventId) params.set('eventId', query.eventId);
    if (query.action) params.set('action', query.action);
    return `${endpoints.adminModeration.auditLog}?${params.toString()}`;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(text: string): boolean {
    return UUID_PATTERN.test(text.trim());
}

// Who did it: the admin's name, else their email, else the start of their id (an account since deleted).
export function auditAdminLabel(entry: Pick<AdminAuditLogResponseDto, 'adminName' | 'adminEmail' | 'adminUserId'>): string {
    return entry.adminName?.trim() || entry.adminEmail || entry.adminUserId.slice(0, 8);
}

// A detail as text: strings as they are, everything else as JSON.
export function formatAuditDetail(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '—';
    return JSON.stringify(value);
}

// What the drawer lists: every detail but the reason, which has its own line.
export function auditDetailEntries(details: Record<string, unknown>): { key: string; value: string }[] {
    return Object.entries(details)
        .filter(([key]) => key !== 'reason')
        .map(([key, value]) => ({ key, value: formatAuditDetail(value) }));
}

export function auditReason(details: Record<string, unknown>): string | null {
    return typeof details.reason === 'string' && details.reason.trim() ? details.reason : null;
}

function text(value: unknown): string | null {
    return typeof value === 'string' && value ? value : null;
}

function list(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
}

// One line on what an entry changed, for the actions the event and plan pages record. Null for
// the rest; the drawer lists their details as they are.
export type AuditSummary =
    | { kind: 'configSet'; moduleKey: string; configKey: string; previous: unknown; next: unknown; via: 'extra' | 'enabled' | 'value' }
    | { kind: 'configReset'; moduleKey: string; configKey: string; previous: unknown }
    | { kind: 'module'; moduleKey: string }
    | { kind: 'provisioned'; title: string | null; planTierCode: string | null; settings: number }
    | { kind: 'planModules'; planTierCode: string | null; added: string[]; removed: string[] }
    | { kind: 'planConfig'; planTierCode: string | null; moduleKey: string; before: Record<string, unknown>; after: Record<string, unknown> };

export function auditSummary(entry: Pick<AdminAuditLogResponseDto, 'action' | 'details'>): AuditSummary | null {
    const d = entry.details;
    const moduleKey = text(d.moduleKey);
    switch (entry.action) {
        case 'EVENT_MODULE_CONFIG_SET': {
            const configKey = text(d.configKey);
            if (!moduleKey || !configKey) return null;
            const via = 'value' in d ? 'value' : 'enabled' in d ? 'enabled' : 'extra';
            return { kind: 'configSet', moduleKey, configKey, previous: d.previous ?? null, next: d[via] ?? null, via };
        }
        case 'EVENT_MODULE_CONFIG_RESET': {
            const configKey = text(d.configKey);
            if (!moduleKey || !configKey) return null;
            return { kind: 'configReset', moduleKey, configKey, previous: d.previous ?? null };
        }
        case 'EVENT_MODULE_GRANTED':
        case 'EVENT_MODULE_REVOKED':
            return moduleKey ? { kind: 'module', moduleKey } : null;
        case 'EVENT_PROVISIONED':
            return { kind: 'provisioned', title: text(d.title), planTierCode: text(d.planTierCode), settings: list(d.moduleConfigs).length };
        case 'PLAN_MODULES_CHANGED':
            return { kind: 'planModules', planTierCode: text(d.planTierCode), added: list(d.added), removed: list(d.removed) };
        case 'PLAN_MODULE_CONFIG_CHANGED': {
            if (!moduleKey) return null;
            const object = (value: unknown) => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
            return { kind: 'planConfig', planTierCode: text(d.planTierCode), moduleKey, before: object(d.before), after: object(d.after) };
        }
        default:
            return null;
    }
}
