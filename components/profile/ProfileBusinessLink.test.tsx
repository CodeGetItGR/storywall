import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProfileBusinessLink } from '@/components/profile/ProfileBusinessLink';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
const me = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: me.data }) }));

afterEach(cleanup);

describe('ProfileBusinessLink', () => {
    it('is hidden for people who are neither vendor nor partner', () => {
        me.data = { vendor: false, partner: false };
        const { container } = render(<ProfileBusinessLink />);
        expect(container.textContent).toBe('');
    });

    it('is hidden while the profile has not loaded', () => {
        me.data = undefined;
        const { container } = render(<ProfileBusinessLink />);
        expect(container.textContent).toBe('');
    });

    it.each([{ vendor: true }, { partner: true }])('links to the business page for %o', (flags) => {
        me.data = flags;
        render(<ProfileBusinessLink />);
        expect(screen.getByRole('link', { name: 'ProfilePage.myBusiness.title' }).getAttribute('href')).toBe('/business');
    });
});
