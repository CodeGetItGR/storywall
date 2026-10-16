import { endpoints } from '@/lib/api/endpoints';
import type { AppLandingReviewDto, AppReviewStatus } from '@/lib/api/types';
import { routes } from '@/lib/routes';

export const REVIEW_STAR_VALUES = [1, 2, 3, 4, 5] as const;
export const REVIEW_COMMENT_MAX = 500;
export const APP_REVIEW_STATUSES: AppReviewStatus[] = ['PENDING', 'APPROVED', 'HIDDEN'];
export const ADMIN_APP_REVIEWS_PAGE_SIZE = 50;

// Mirrors the server: consent only counts for 4–5 stars with a comment.
const CONSENT_MIN_STARS = 4;
// Fewer than this in the page's language and the landing section stays hidden.
export const LANDING_REVIEWS_MIN = 3;

const EVENT_FEED_PATH = /^\/events\/[^/]+\/feed\/?$/;

export function canOfferPublicConsent(stars: number | null, comment: string): boolean {
    return stars !== null && stars >= CONSENT_MIN_STARS && comment.trim().length > 0;
}

// The prompt opens on home and an event's feed only, never over tools, settings or the demo.
export function isReviewPromptRoute(pathname: string): boolean {
    return pathname === routes.home || EVENT_FEED_PATH.test(pathname);
}

export function landingReviewsFor(reviews: AppLandingReviewDto[] | undefined, locale: string): AppLandingReviewDto[] {
    const inLocale = (reviews ?? []).filter((review) => review.locale === locale);
    return inLocale.length >= LANDING_REVIEWS_MIN ? inLocale : [];
}

export function adminAppReviewsPath(page: number, status: AppReviewStatus | null): string {
    const params = new URLSearchParams({ page: String(page), size: String(ADMIN_APP_REVIEWS_PAGE_SIZE) });
    if (status) params.set('status', status);
    return `${endpoints.admin.appReviews.list}?${params.toString()}`;
}
