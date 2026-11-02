import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LANDING_QR_FAQ_INDEX, LandingFaq } from '@/components/landing/LandingFaq';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const live = vi.hoisted(() => ({ value: true }));

vi.mock('next-intl/server', async () => ({
    ...(await import('@/components/occasions/wedding/__fixtures__/intlServerMock')),
    getLocale: async () => 'el',
}));
vi.mock('@/lib/qrWeddingPage.server', () => ({ loadQrWeddingPageLive: async () => live.value }));

afterEach(() => {
    cleanup();
    live.value = true;
});

describe('LandingFaq on the landing', () => {
    it('links the "no app" answer to the QR page in both languages', () => {
        for (const messages of [el, en]) {
            const [question, answer] = messages.LandingPage.faq.items[LANDING_QR_FAQ_INDEX]!;
            expect(question).toMatch(/app|εφαρμογή/);
            expect(answer).toContain('QR');
        }
    });

    it('ends that answer with the tracked QR page link while the page is live', async () => {
        render(await LandingFaq({}));
        const link = screen.getByRole('link', { name: 'QR code για φωτογραφίες γάμου' });
        expect(link).toHaveAttribute('href', '/el/qr-code-gamou');
        expect(link).toHaveAttribute('data-link-click', 'QR_WEDDING:faq');
    });

    it('leaves the answers plain while the page is off', async () => {
        live.value = false;
        render(await LandingFaq({}));
        expect(screen.queryByRole('link')).toBeNull();
    });
});
