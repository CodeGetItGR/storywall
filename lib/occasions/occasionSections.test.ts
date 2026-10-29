import { describe, expect, it } from 'vitest';

import { occasionHeaderLinks } from '@/lib/occasions/occasionSections';

describe('occasionHeaderLinks', () => {
    it('links the header to how it works, features, plans and the FAQ', () => {
        const nav = ['Home', 'How it works', 'Features', 'Plans', 'Sign in'];
        const mobileNav = ['Home', 'How', 'Features', 'Plans', 'Sign in'];
        expect(occasionHeaderLinks(nav, mobileNav, 'FAQ')).toEqual([
            { href: '#howItWorks', label: 'How it works', mobileLabel: 'How' },
            { href: '#features', label: 'Features', mobileLabel: 'Features' },
            { href: '#pricing', label: 'Plans', mobileLabel: 'Plans' },
            { href: '#faq', label: 'FAQ', mobileLabel: 'FAQ' },
        ]);
    });
});
