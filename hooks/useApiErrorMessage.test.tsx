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
});
