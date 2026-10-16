import { describe, expect, it } from 'vitest';

import type { AppLandingReviewDto } from '@/lib/api/types';
import { adminAppReviewsPath, canOfferPublicConsent, isReviewPromptRoute, landingReviewsFor } from '@/lib/reviews';

function review(id: string, locale: string): AppLandingReviewDto {
    return { id, stars: 5, comment: 'Great', firstName: 'Maria', role: 'HOST', eventType: 'WEDDING', locale };
}

describe('canOfferPublicConsent', () => {
    it('needs four or more stars and a comment', () => {
        expect(canOfferPublicConsent(5, 'Loved it')).toBe(true);
        expect(canOfferPublicConsent(4, 'Loved it')).toBe(true);
        expect(canOfferPublicConsent(3, 'Loved it')).toBe(false);
        expect(canOfferPublicConsent(5, '   ')).toBe(false);
        expect(canOfferPublicConsent(null, 'Loved it')).toBe(false);
    });
});

describe('isReviewPromptRoute', () => {
    it('allows home and an event feed only', () => {
        expect(isReviewPromptRoute('/home')).toBe(true);
        expect(isReviewPromptRoute('/events/abc/feed')).toBe(true);
        expect(isReviewPromptRoute('/events/abc/feed/')).toBe(true);
        expect(isReviewPromptRoute('/events/abc/manage')).toBe(false);
        expect(isReviewPromptRoute('/demo/wedding/feed')).toBe(false);
        expect(isReviewPromptRoute('/profile')).toBe(false);
    });
});

describe('landingReviewsFor', () => {
    it('keeps the page language and needs three', () => {
        const reviews = [review('1', 'en'), review('2', 'en'), review('3', 'el'), review('4', 'en')];
        expect(landingReviewsFor(reviews, 'en').map((r) => r.id)).toEqual(['1', '2', '4']);
        expect(landingReviewsFor(reviews, 'el')).toEqual([]);
        expect(landingReviewsFor(undefined, 'en')).toEqual([]);
    });
});

describe('adminAppReviewsPath', () => {
    it('adds the page and an optional status', () => {
        expect(adminAppReviewsPath(0, null)).toBe('/api/admin/app-reviews?page=0&size=50');
        expect(adminAppReviewsPath(2, 'PENDING')).toBe('/api/admin/app-reviews?page=2&size=50&status=PENDING');
    });
});
