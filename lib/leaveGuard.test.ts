import { afterEach, describe, expect, it } from 'vitest';

import { inAppHref } from '@/lib/leaveGuard';

const here = { origin: 'https://app.example', pathname: '/events/e-1/feed', search: '' };

function linkClick(href: string, init: Partial<MouseEventInit> = {}, attributes: Record<string, string> = {}) {
    const anchor = document.createElement('a');
    anchor.href = href;
    for (const [name, value] of Object.entries(attributes)) anchor.setAttribute(name, value);
    const child = document.createElement('span');
    anchor.append(child);
    document.body.append(anchor);
    const event = new MouseEvent('click', { bubbles: true, button: 0, ...init });
    Object.defineProperty(event, 'target', { value: child });
    return event;
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('inAppHref', () => {
    it('returns the page an in-app link opens', () => {
        expect(inAppHref(linkClick('https://app.example/events/e-1/manage?tab=billing'), here)).toBe('/events/e-1/manage?tab=billing');
    });

    it('lets other sites, new tabs, downloads and modified clicks through', () => {
        expect(inAppHref(linkClick('https://other.example/'), here)).toBeNull();
        expect(inAppHref(linkClick('https://app.example/x', {}, { target: '_blank' }), here)).toBeNull();
        expect(inAppHref(linkClick('https://app.example/x', {}, { download: '' }), here)).toBeNull();
        expect(inAppHref(linkClick('https://app.example/x', { ctrlKey: true }), here)).toBeNull();
        expect(inAppHref(linkClick('https://app.example/x', { button: 1 }), here)).toBeNull();
    });

    it('lets a jump within the same page through', () => {
        expect(inAppHref(linkClick('https://app.example/events/e-1/feed#posts'), here)).toBeNull();
    });

    it('ignores a click that is not on a link', () => {
        const event = new MouseEvent('click', { bubbles: true, button: 0 });
        Object.defineProperty(event, 'target', { value: document.body });
        expect(inAppHref(event, here)).toBeNull();
    });
});
