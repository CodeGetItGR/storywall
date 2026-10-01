import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LandingFooter } from '@/components/landing/LandingFooter';

vi.mock('next-intl/server', () => ({
    getTranslations: async () => Object.assign((key: string) => key, { raw: () => [] }),
}));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: () => null }));
vi.mock('@/components/landing/LandingMotionToggle', () => ({ LandingMotionToggle: () => null }));
vi.mock('@/components/landing/LandingNewsletter', () => ({ LandingNewsletter: () => null }));

describe('LandingFooter', () => {
    it('links to the community guidelines', async () => {
        render(await LandingFooter());

        expect(screen.getByRole('link', { name: 'communityGuidelines' })).toHaveAttribute(
            'href',
            '/legal/community-guidelines',
        );
    });
});
