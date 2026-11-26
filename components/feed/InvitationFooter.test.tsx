import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvitationFooter } from '@/components/feed/InvitationFooter';
import { routes } from '@/lib/routes';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

vi.mock('next/navigation', () => ({ usePathname: () => '/events/e-1/feed' }));

afterEach(cleanup);

describe('InvitationFooter', () => {
    it.each([
        ['en', en, 'Made with'],
        ['el', el, 'Φτιαγμένο με το'],
    ] as const)('says what it was made with, linked to the landing page (%s)', (locale, messages, text) => {
        render(
            <NextIntlClientProvider locale={locale} messages={messages}>
                <InvitationFooter />
            </NextIntlClientProvider>,
        );
        const link = screen.getByRole('link');
        expect(link.getAttribute('href')).toBe(routes.landing);
        expect(link.textContent).toBe(text);
        expect(screen.getAllByAltText('StoryWall')).toHaveLength(2);
    });
});
