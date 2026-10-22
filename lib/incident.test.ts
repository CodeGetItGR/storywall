import { describe, expect, it, vi } from 'vitest';

import { isPausedRequest, isPurchasePath } from '@/lib/incident';

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

describe('isPausedRequest', () => {
    it('refuses a checkout POST', () => {
        expect(isPausedRequest('POST', '/api/events/e1/checkout', '{}')).toBe(true);
    });

    it('refuses a multipart POST carrying a file', () => {
        expect(isPausedRequest('POST', '/api/events/e1/media', formWith(new Blob(['x'])))).toBe(true);
    });

    it('lets a multipart POST without a file through', () => {
        expect(isPausedRequest('POST', '/api/beta-feedback/bug-reports', formWith('text'))).toBe(false);
    });

    it('lets reads through', () => {
        expect(isPausedRequest('GET', '/api/events/e1/checkout', undefined)).toBe(false);
    });
});
