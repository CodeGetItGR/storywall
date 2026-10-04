import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LandingFooter } from '@/components/landing/LandingFooter';

vi.mock('next-intl/server', () => ({
    getTranslations: async () => Object.assign((key: string) => key, { raw: () => [] }),
}));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: () => null }));
vi.mock('@/components/landing/LandingMotionToggle', () => ({ LandingMotionToggle: () => null }));
vi.mock('@/components/landing/LandingNewsletter', () => ({ LandingNewsletter: () => null }));

describe('LandingFooter', () => {
    afterEach(cleanup);

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
});
