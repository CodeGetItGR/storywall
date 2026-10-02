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

        expect(screen.getByRole('link', { name: 'communityGuidelines' })).toHaveAttribute(
            'href',
            '/legal/community-guidelines',
        );
    });

    it('links to the public content notice form', async () => {
        render(await LandingFooter());

        expect(screen.getByRole('link', { name: 'reportContent' })).toHaveAttribute('href', '/report-content');
    });
});
