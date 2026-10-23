import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LandingFooter } from '@/components/landing/LandingFooter';

vi.mock('next-intl/server', () => ({
    getLocale: async () => 'el',
    getTranslations: async () => (key: string) => key,
}));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: () => null }));
vi.mock('@/components/landing/LandingMotionToggle', () => ({ LandingMotionToggle: () => null }));
vi.mock('@/components/landing/LandingNewsletter', () => ({ LandingNewsletter: () => null }));
vi.mock('@/components/consent/CookieSettingsLink', () => ({ CookieSettingsLink: () => <button type="button">cookieSettings</button> }));

const qrWeddingLive = vi.hoisted(() => vi.fn(async () => true));
vi.mock('@/lib/qrWeddingPage.server', () => ({ loadQrWeddingPageLive: () => qrWeddingLive() }));

describe('LandingFooter', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllEnvs();
    });

    it('links to the community guidelines', async () => {
        render(await LandingFooter());

        expect(screen.getByRole('link', { name: 'communityGuidelines' })).toHaveAttribute('href', '/legal/community-guidelines');
    });

    it('links to the public content notice form', async () => {
        render(await LandingFooter());

        expect(screen.getByRole('link', { name: 'reportContent' })).toHaveAttribute('href', '/report-content');
    });

    it('links every legal page', async () => {
        render(await LandingFooter());

        expect(screen.getByRole('link', { name: 'legalLinks.privacy' })).toHaveAttribute('href', '/legal/privacy');
        expect(screen.getByRole('link', { name: 'legalLinks.terms' })).toHaveAttribute('href', '/legal/terms');
        expect(screen.getByRole('link', { name: 'legalLinks.cookies' })).toHaveAttribute('href', '/legal/cookies');
        expect(screen.getByRole('link', { name: 'legalLinks.withdrawal' })).toHaveAttribute('href', '/legal/withdrawal-terms');
        expect(screen.getByRole('link', { name: 'legalLinks.contact' })).toHaveAttribute('href', '/contact');
    });

    it('links every social profile in a new tab', async () => {
        render(await LandingFooter());

        expect(screen.getByRole('link', { name: 'socialLinks.instagram' })).toHaveAttribute('href', 'https://www.instagram.com/storywall.gr/');
        expect(screen.getByRole('link', { name: 'socialLinks.tiktok' })).toHaveAttribute('href', 'https://www.tiktok.com/@storywall.gr');
        expect(screen.getByRole('link', { name: 'socialLinks.facebook' })).toHaveAttribute('href', 'https://www.facebook.com/storywall.gr');
        expect(screen.getByRole('link', { name: 'socialLinks.facebook' })).toHaveAttribute('target', '_blank');
    });

    it('offers the cookie settings next to the legal links', async () => {
        render(await LandingFooter());

        expect(screen.getByRole('button', { name: 'cookieSettings' })).toBeInTheDocument();
    });

    it('links to the partner page in the page language', async () => {
        render(await LandingFooter());

        expect(screen.getByRole('link', { name: 'exploreLinks.forBusiness' })).toHaveAttribute('href', '/el/epaggelmaties');
    });

    it('links to the wedding QR page in the page language', async () => {
        render(await LandingFooter());

        expect(screen.getByRole('link', { name: 'exploreLinks.qrWedding' })).toHaveAttribute('href', '/el/qr-code-gamou');
    });

    it('leaves out the wedding QR link while weddings are off', async () => {
        qrWeddingLive.mockResolvedValueOnce(false);
        render(await LandingFooter());

        expect(screen.queryByRole('link', { name: 'exploreLinks.qrWedding' })).not.toBeInTheDocument();
    });

    it('leaves out the partner and occasion links on the production site before launch', async () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        render(await LandingFooter());

        expect(screen.queryByRole('link', { name: 'exploreLinks.forBusiness' })).not.toBeInTheDocument();
        expect(screen.queryByText('occasions')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'exploreLinks.qrWedding' })).toBeInTheDocument();
    });

    it('points the anchors back at the landing when rendered elsewhere', async () => {
        render(await LandingFooter({ anchorBase: '/el', topHref: '#top' }));

        expect(screen.getByRole('link', { name: 'exploreLinks.faq' })).toHaveAttribute('href', '/el#faq');
        expect(screen.getByRole('link', { name: /backToTop/ })).toHaveAttribute('href', '#top');
    });
});
