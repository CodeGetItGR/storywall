import { describe, expect, it } from 'vitest';

import { ADMIN_EMAIL_TEMPLATE_ORDER, adminEmailRequest, hasTokenLink } from '@/lib/adminEmails';

const BASE = { locale: 'en' as const, eventId: '', subject: '', body: '' };

describe('adminEmailRequest', () => {
    it('sends only the fields the template uses', () => {
        expect(adminEmailRequest({ ...BASE, template: 'PASSWORD_RESET', eventId: 'e1', subject: 's', body: 'b' })).toEqual({
            template: 'PASSWORD_RESET',
            locale: 'en',
        });
        expect(adminEmailRequest({ ...BASE, template: 'PROVISIONED_HOST_WELCOME', eventId: 'e1' })).toEqual({
            template: 'PROVISIONED_HOST_WELCOME',
            locale: 'en',
            eventId: 'e1',
        });
        expect(adminEmailRequest({ ...BASE, template: 'CUSTOM', subject: ' Hi ', body: ' There ' })).toEqual({
            template: 'CUSTOM',
            locale: 'en',
            subject: 'Hi',
            body: 'There',
        });
    });

    it('is null until the template has what it needs', () => {
        expect(adminEmailRequest({ ...BASE, template: null })).toBeNull();
        expect(adminEmailRequest({ ...BASE, template: 'PROVISIONED_HOST_WELCOME' })).toBeNull();
        expect(adminEmailRequest({ ...BASE, template: 'CUSTOM', subject: 'Hi', body: '  ' })).toBeNull();
    });
});

describe('hasTokenLink', () => {
    it('is true only for templates that carry a single-use link', () => {
        expect(ADMIN_EMAIL_TEMPLATE_ORDER.filter(hasTokenLink)).toEqual(['PASSWORD_RESET', 'EMAIL_VERIFICATION']);
    });
});
