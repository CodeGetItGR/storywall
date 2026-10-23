import { describe, expect, it, vi } from 'vitest';

import { INCIDENT_MODE, isPausedRequest, isPurchaseOrUpload, isPurchasePath } from '@/lib/incident';

vi.unmock('@/lib/incident');

function formWith(value: string | Blob): FormData {
    const form = new FormData();
    form.append('field', value);
    return form;
}

describe('isPurchasePath', () => {
    it('matches every checkout that starts a payment', () => {
        expect(isPurchasePath('/api/events/e1/checkout')).toBe(true);
        expect(isPurchasePath('/api/events/e1/upgrade-checkout')).toBe(true);
        expect(isPurchasePath('/api/events/e1/storage-checkout')).toBe(true);
        expect(isPurchasePath('/api/events/e1/extension-checkout')).toBe(true);
    });

    it('leaves code previews and other routes alone', () => {
        expect(isPurchasePath('/api/events/e1/checkout/preview-code')).toBe(false);
        expect(isPurchasePath('/api/checkout/preview-code')).toBe(false);
        expect(isPurchasePath('/api/events/e1/posts')).toBe(false);
    });
});

describe('isPurchaseOrUpload', () => {
    it('matches a checkout POST', () => {
        expect(isPurchaseOrUpload('POST', '/api/events/e1/checkout', '{}')).toBe(true);
    });

    it('matches a multipart POST carrying a file', () => {
        expect(isPurchaseOrUpload('POST', '/api/events/e1/media', formWith(new Blob(['x'])))).toBe(true);
    });

    it('skips a multipart POST without a file', () => {
        expect(isPurchaseOrUpload('POST', '/api/beta-feedback/bug-reports', formWith('text'))).toBe(false);
    });

    it('skips reads', () => {
        expect(isPurchaseOrUpload('GET', '/api/events/e1/checkout', undefined)).toBe(false);
    });
});

describe('isPausedRequest', () => {
    it.runIf(!INCIDENT_MODE)('lets purchases and uploads through while the switch is off', () => {
        expect(isPausedRequest('POST', '/api/events/e1/checkout', '{}')).toBe(false);
        expect(isPausedRequest('POST', '/api/events/e1/media', formWith(new Blob(['x'])))).toBe(false);
    });

    it.runIf(INCIDENT_MODE)('refuses purchases and uploads while the switch is on', () => {
        expect(isPausedRequest('POST', '/api/events/e1/checkout', '{}')).toBe(true);
        expect(isPausedRequest('POST', '/api/events/e1/media', formWith(new Blob(['x'])))).toBe(true);
    });
});
