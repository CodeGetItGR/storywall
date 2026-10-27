import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LandingReviews } from '@/components/landing/LandingReviews';
import type { AppLandingReviewDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));

const config = vi.hoisted(() => ({ landingReviews: [] as AppLandingReviewDto[] }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: config }) }));
vi.mock('@/hooks/useLocalizedAppEventTypeCopy', () => ({ useLocalizedAppEventTypeCopy: () => () => ({ name: 'Wedding' }) }));

function review(id: string, locale = 'en'): AppLandingReviewDto {
    return { id, stars: 5, comment: `Comment ${id}`, firstName: 'Maria', role: 'HOST', eventType: 'WEDDING', locale };
}

afterEach(cleanup);
beforeEach(() => {
    config.landingReviews = [];
});

describe('LandingReviews', () => {
    it('renders nothing under three reviews in the page language', () => {
        config.landingReviews = [review('1'), review('2'), review('3', 'el')];
        const { container } = render(<LandingReviews />);
        expect(container.innerHTML).toBe('');
    });

    it('shows the reviews with name, role and occasion', () => {
        config.landingReviews = [review('1'), review('2'), review('3')];
        render(<LandingReviews />);
        expect(screen.getByRole('heading', { name: 'heading' })).toBeTruthy();
        expect(screen.getByText('Comment 1')).toBeTruthy();
        expect(screen.getAllByText('Maria · role.HOST · Wedding')).toHaveLength(3);
    });
});
