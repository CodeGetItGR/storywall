// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import robots from '@/app/robots';

describe('robots', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('keeps crawlers and link previews out of the business page and the old partner page', () => {
        vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
        const rules = robots().rules;
        const groups = Array.isArray(rules) ? rules : [rules];
        for (const group of groups) {
            expect(group.disallow).toEqual(expect.arrayContaining(['/business', '/partner']));
        }
    });

    it('lets crawlers reach the invitation catalogue and theme pages', () => {
        vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
        const rules = robots().rules;
        const groups = Array.isArray(rules) ? rules : [rules];
        const paths = ['/invitations', '/invitations/olive', '/el/prosklitiria', '/el/prosklitiria/olive'];
        for (const group of groups) {
            const disallowed = [group.disallow ?? []].flat();
            for (const path of paths) expect(disallowed.filter((prefix) => path.startsWith(prefix)), path).toEqual([]);
        }
    });

    it('keeps crawlers out of campaign short addresses but lets link previews follow them', () => {
        vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
        const rules = robots().rules;
        const groups = Array.isArray(rules) ? rules : [rules];
        const crawlers = groups.find((group) => group.userAgent === '*');
        const previews = groups.find((group) => Array.isArray(group.userAgent));
        expect(crawlers?.disallow).toContain('/c/');
        expect(previews?.disallow).not.toContain('/c/');
    });

    describe('image search', () => {
        const imageCrawlerRules = () => {
            vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
            const rules = robots().rules;
            const groups = Array.isArray(rules) ? rules : [rules];
            const group = groups.find((candidate) => candidate.userAgent === 'Googlebot-Image');
            return [group?.disallow ?? []].flat();
        };
        const isBlocked = (path: string) => imageCrawlerRules().some((rule) => path.startsWith(rule));

        it('blocks a cutout at its own URL and at its optimizer URL', () => {
            expect(isBlocked('/landing/sw-scene-item-sw-post-1.webp?dpl=abc')).toBe(true);
            expect(isBlocked('/_next/image?url=%2Flanding%2Fsw-scene-item-sw-post-1.webp&w=640&q=75')).toBe(true);
            expect(isBlocked('/_next/image?url=%2Flanding%2Fwedding%2Fwedding-rsvp-replies-without.webp&w=3840&q=75')).toBe(true);
            expect(isBlocked('/_next/image?url=https%3A%2F%2Fdemo-media.storywall.gr%2Ftheme-presets%2Fa%2Fb.png&w=640&q=75')).toBe(true);
        });

        it('keeps the product pictures and real photos searchable', () => {
            expect(isBlocked('/landing/storywall-demo-preview-with-two-angled-smartphones-showing-the-a.webp')).toBe(false);
            expect(isBlocked('/landing/wedding/wedding-rsvp-replies-without-and-with.webp')).toBe(false);
            expect(isBlocked('/landing/wedding/wedding-rsvp-replies-without-and-with-en.webp')).toBe(false);
            expect(isBlocked('/landing/04-wedding-reception-santorini.webp')).toBe(false);
            expect(isBlocked('/_next/image?url=%2Flanding%2Fguest-viewing-the-storywall-invitation-on-a-phone.webp&w=640&q=75')).toBe(false);
        });

        it('still keeps the image crawler out of private paths', () => {
            expect(imageCrawlerRules()).toEqual(expect.arrayContaining(['/events/', '/post/', '/q/', '/c/']));
        });

        it('leaves the page crawler free to load every image', () => {
            vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
            const rules = robots().rules;
            const groups = Array.isArray(rules) ? rules : [rules];
            const crawlers = groups.find((group) => group.userAgent === '*');
            expect([crawlers?.disallow].flat().some((rule) => rule?.includes('landing'))).toBe(false);
        });
    });
});
