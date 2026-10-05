import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { ApiError } from '@/lib/api/client';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

function describeIn(locale: 'en' | 'el', error: unknown): string {
    const messages = locale === 'en' ? en : el;
    const wrapper = ({ children }: { children: ReactNode }) => (
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
            {children}
        </NextIntlClientProvider>
    );
    return renderHook(() => useApiErrorMessage(), { wrapper }).result.current(error);
}

describe('useApiErrorMessage', () => {
    // Every join path (invite accept, member create, claim, co-host, gift claim) shows this.
    it('maps 4014 EVENT_BANNED to the localized refusal', () => {
        const banned = new ApiError(403, { errorCode: 4014, detail: 'backend detail' });

        expect(describeIn('en', banned)).toBe("You can't join this event.");
        expect(describeIn('el', banned)).toBe('Δεν μπορείτε να συμμετάσχετε σε αυτή την εκδήλωση.');
    });

    it('gives a 429 with a short wait in seconds', () => {
        const limited = new ApiError(429, { errorCode: 3010, retryAfterSeconds: 30 });

        expect(describeIn('en', limited)).toBe('Too many requests. Try again in 30s.');
    });

    // An upload budget's 429 can ask for most of an hour.
    it('gives a 429 with a long wait in minutes', () => {
        const limited = new ApiError(429, { errorCode: 3010, retryAfterSeconds: 3540 });

        expect(describeIn('en', limited)).toBe('Too many requests. Try again in 59 min.');
        expect(describeIn('el', limited)).toBe('Πάρα πολλά αιτήματα. Δοκιμάστε ξανά σε 59 λεπτά.');
    });

    it('maps 3045 to the two-downloads-at-a-time copy, not the generic 429', () => {
        const busy = new ApiError(429, { errorCode: 3045, retryAfterSeconds: 60 });

        expect(describeIn('en', busy)).toBe('You already have two gallery downloads running. Start another once one finishes.');
    });

    it('maps 3046 to the daily gallery allowance, with the wait in hours', () => {
        const spent = new ApiError(429, { errorCode: 3046, retryAfterSeconds: 3 * 3600 + 5 });
        const spentSoon = new ApiError(429, { errorCode: 3046, retryAfterSeconds: 600 });

        expect(describeIn('en', spent)).toBe('This gallery has been downloaded as much as it can be for today. Try again in about 4 hours.');
        expect(describeIn('en', spentSoon)).toBe('This gallery has been downloaded as much as it can be for today. Try again in about an hour.');
        expect(describeIn('el', spent)).toBe('Η συλλογή έχει κατέβει όσο επιτρέπεται για σήμερα. Δοκιμάστε ξανά σε περίπου 4 ώρες.');
    });

    it.each([
        [5117, 'That address already has a co-host invitation waiting. Revoke it to send a new one.'],
        [5119, 'The server is busy right now. Try again in a moment.'],
        [5128, 'This was just changed somewhere else. Refresh and try again.'],
        [5143, 'This theme is no longer available — pick another.'],
        [5144, "This event has ended, so its theme can't be changed."],
        [5141, 'You have reached the story limit. Older stories expire after 24 hours, or delete one to post another.'],
    ])('maps %i to its own copy', (errorCode, message) => {
        expect(describeIn('en', new ApiError(409, { errorCode }))).toBe(message);
    });
});
