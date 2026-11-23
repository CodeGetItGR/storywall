import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { MembersOnlyLock } from '@/components/feed/membersOnly/MembersOnlyLock';
import en from '@/messages/en.json';

afterEach(cleanup);

describe('MembersOnlyLock', () => {
    it("shows the section's name, the lock and a link to sign in and join", () => {
        render(
            <NextIntlClientProvider locale="en" messages={en}>
                <MembersOnlyLock title="Dress code" joinHref="/q/token" />
            </NextIntlClientProvider>,
        );
        expect(screen.getByRole('heading', { name: 'Dress code' })).toBeTruthy();
        expect(screen.getByRole('link', { name: en.FeedLayout.locked.join }).getAttribute('href')).toBe('/q/token');
    });
});
