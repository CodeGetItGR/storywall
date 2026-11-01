import { describe, expect, it } from 'vitest';

import {
    AUDIT_ACTIONS,
    auditActionTone,
    auditAdminLabel,
    auditDetailEntries,
    auditLogKeys,
    auditLogPath,
    auditReason,
    auditSummary,
    formatAuditDetail,
    isAuditAction,
    isUuid,
} from '@/lib/adminAuditLog';
import type { AdminAuditAction } from '@/lib/api/types';

const EVENT_ID = '3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

describe('audit actions', () => {
    it('lists every action once', () => {
        expect(new Set(AUDIT_ACTIONS).size).toBe(AUDIT_ACTIONS.length);
        expect(AUDIT_ACTIONS).toContain('EVENT_MODULE_CONFIG_SET');
        expect(AUDIT_ACTIONS).toContain('PLAN_MODULE_CONFIG_CHANGED');
    });

    it('tells an action from any other text', () => {
        expect(isAuditAction('EVENT_PROVISIONED')).toBe(true);
        expect(isAuditAction('event_provisioned')).toBe(false);
        expect(isAuditAction('')).toBe(false);
    });

    it('colours actions by what they do', () => {
        const tones: Record<string, string> = {
            EVENT_MODULE_REVOKED: 'danger',
            ACCOUNT_DELETED: 'danger',
            CONTENT_REMOVED: 'danger',
            EVENT_CLOSED: 'danger',
            OUTREACH_REQUEST_DECLINED: 'danger',
            EVENT_SUSPENDED: 'warn',
            MEMBER_BANNED: 'warn',
            EVENT_PROVISIONED: 'good',
            EVENT_MODULE_GRANTED: 'good',
            EVENT_SUSPENSION_LIFTED: 'good',
            BAN_LIFTED: 'good',
            ADMIN_DEVICE_PAIRED: 'good',
            EVENT_MODULE_CONFIG_SET: 'neutral',
            EVENT_MODULE_CONFIG_RESET: 'neutral',
            PLAN_MODULE_CONFIG_CHANGED: 'neutral',
            CONTENT_VIEWED: 'neutral',
        };
        for (const [action, tone] of Object.entries(tones)) {
            expect(auditActionTone(action as AdminAuditAction), action).toBe(tone);
        }
    });
});

describe('audit log requests', () => {
    it('asks for a page with the default size and no filters', () => {
        expect(auditLogPath({ page: 0 })).toMatch(/\?page=0&size=50$/);
    });

    it('adds only the filters that are set', () => {
        const path = auditLogPath({ page: 2, size: 10, adminUserId: 'a-1', eventId: EVENT_ID, action: 'EVENT_MODULE_CONFIG_SET' });
        const params = new URLSearchParams(path.split('?')[1]);
        expect(Object.fromEntries(params)).toEqual({
            page: '2',
            size: '10',
            adminUserId: 'a-1',
            eventId: EVENT_ID,
            action: 'EVENT_MODULE_CONFIG_SET',
        });
        expect(auditLogPath({ page: 0, adminUserId: null, eventId: '', action: null })).not.toMatch(/adminUserId|eventId|action/);
    });

    it('keys every filter, and puts every page under one prefix', () => {
        const a = auditLogKeys.list({ page: 0, eventId: EVENT_ID });
        const b = auditLogKeys.list({ page: 0, eventId: null });
        expect(a).not.toEqual(b);
        expect(a.slice(0, 2)).toEqual([...auditLogKeys.all]);
        expect(auditLogKeys.list({ page: 0 })).toEqual(auditLogKeys.list({ page: 0, size: 50, adminUserId: null }));
    });

    it('checks an event id before it filters by it', () => {
        expect(isUuid(EVENT_ID)).toBe(true);
        expect(isUuid(` ${EVENT_ID.toUpperCase()} `)).toBe(true);
        expect(isUuid('3f2b1c4d')).toBe(false);
        expect(isUuid('')).toBe(false);
    });
});

describe('audit entry text', () => {
    it('names the admin, else their email, else the start of their id', () => {
        expect(auditAdminLabel({ adminName: 'Maria', adminEmail: 'm@x.gr', adminUserId: EVENT_ID })).toBe('Maria');
        expect(auditAdminLabel({ adminName: '  ', adminEmail: 'm@x.gr', adminUserId: EVENT_ID })).toBe('m@x.gr');
        expect(auditAdminLabel({ adminName: null, adminEmail: null, adminUserId: EVENT_ID })).toBe('3f2b1c4d');
    });

    it('shows details as text and keeps the reason apart', () => {
        expect(formatAuditDetail('vendors')).toBe('vendors');
        expect(formatAuditDetail(null)).toBe('—');
        expect(formatAuditDetail(undefined)).toBe('—');
        expect(formatAuditDetail(['MUSIC'])).toBe('["MUSIC"]');
        expect(formatAuditDetail(3)).toBe('3');
        expect(auditDetailEntries({ moduleKey: 'vendors', value: 1, reason: 'Asked' })).toEqual([
            { key: 'moduleKey', value: 'vendors' },
            { key: 'value', value: '1' },
        ]);
        expect(auditReason({ reason: 'Asked' })).toBe('Asked');
        expect(auditReason({ reason: '  ' })).toBeNull();
        expect(auditReason({ reason: 3 })).toBeNull();
        expect(auditReason({})).toBeNull();
    });
});

describe('auditSummary', () => {
    it('reads an exact value set for an event', () => {
        expect(
            auditSummary({ action: 'EVENT_MODULE_CONFIG_SET', details: { moduleKey: 'vendors', configKey: 'maxVendors', previous: 5, value: 1, reason: 'Asked' } }),
        ).toEqual({ kind: 'configSet', moduleKey: 'vendors', configKey: 'maxVendors', previous: 5, next: 1, via: 'value' });
    });

    it('reads an extra and a switch', () => {
        expect(auditSummary({ action: 'EVENT_MODULE_CONFIG_SET', details: { moduleKey: 'schedule', configKey: 'maxSections', extra: 2 } })).toEqual({
            kind: 'configSet',
            moduleKey: 'schedule',
            configKey: 'maxSections',
            previous: null,
            next: 2,
            via: 'extra',
        });
        expect(
            auditSummary({ action: 'EVENT_MODULE_CONFIG_SET', details: { moduleKey: 'gallery', configKey: 'qrUploadEnabled', enabled: false } }),
        ).toMatchObject({ via: 'enabled', next: false });
    });

    it('reads a reset, a module grant and a revoke', () => {
        expect(auditSummary({ action: 'EVENT_MODULE_CONFIG_RESET', details: { moduleKey: 'vendors', configKey: 'allowedTypes', previous: ['MUSIC'] } })).toEqual({
            kind: 'configReset',
            moduleKey: 'vendors',
            configKey: 'allowedTypes',
            previous: ['MUSIC'],
        });
        expect(auditSummary({ action: 'EVENT_MODULE_GRANTED', details: { moduleKey: 'vendors' } })).toEqual({ kind: 'module', moduleKey: 'vendors' });
        expect(auditSummary({ action: 'EVENT_MODULE_REVOKED', details: { moduleKey: 'vendors' } })).toEqual({ kind: 'module', moduleKey: 'vendors' });
    });

    it('reads a provisioned event with the settings set on it', () => {
        expect(
            auditSummary({
                action: 'EVENT_PROVISIONED',
                details: { title: 'Wedding', planTierCode: 'BASIC', moduleConfigs: [{ configKey: 'maxVendors' }, { configKey: 'allowedTypes' }] },
            }),
        ).toEqual({ kind: 'provisioned', title: 'Wedding', planTierCode: 'BASIC', settings: 2 });
        expect(auditSummary({ action: 'EVENT_PROVISIONED', details: {} })).toEqual({ kind: 'provisioned', title: null, planTierCode: null, settings: 0 });
    });

    it('reads plan changes', () => {
        expect(auditSummary({ action: 'PLAN_MODULES_CHANGED', details: { planTierCode: 'PRO', added: ['vendors'], removed: [] } })).toEqual({
            kind: 'planModules',
            planTierCode: 'PRO',
            added: ['vendors'],
            removed: [],
        });
        expect(
            auditSummary({ action: 'PLAN_MODULE_CONFIG_CHANGED', details: { planTierCode: 'PRO', moduleKey: 'vendors', before: { maxVendors: 5 }, after: { maxVendors: 1 } } }),
        ).toEqual({ kind: 'planConfig', planTierCode: 'PRO', moduleKey: 'vendors', before: { maxVendors: 5 }, after: { maxVendors: 1 } });
        expect(auditSummary({ action: 'PLAN_MODULE_CONFIG_CHANGED', details: { moduleKey: 'vendors', before: null, after: [1] } })).toMatchObject({
            before: {},
            after: {},
        });
    });

    it('has no summary for missing details or other actions', () => {
        expect(auditSummary({ action: 'EVENT_MODULE_CONFIG_SET', details: { moduleKey: 'vendors' } })).toBeNull();
        expect(auditSummary({ action: 'EVENT_MODULE_CONFIG_RESET', details: {} })).toBeNull();
        expect(auditSummary({ action: 'EVENT_MODULE_GRANTED', details: {} })).toBeNull();
        expect(auditSummary({ action: 'PLAN_MODULE_CONFIG_CHANGED', details: {} })).toBeNull();
        expect(auditSummary({ action: 'CONTENT_VIEWED', details: { postId: 'p' } })).toBeNull();
    });
});
