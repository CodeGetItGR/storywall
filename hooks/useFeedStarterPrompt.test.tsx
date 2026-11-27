import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useFeedStarterPrompt } from '@/hooks/useFeedStarterPrompt';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const wrap = (locale: 'en' | 'el') =>
    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : el}>
                {children}
            </NextIntlClientProvider>
        );
    };

describe('useFeedStarterPrompt', () => {
    it("gives a graduation the then & now prompt in the viewer's language", () => {
        expect(renderHook(() => useFeedStarterPrompt('GRADUATION'), { wrapper: wrap('en') }).result.current).toBe(
            'Then & now: post an old photo with the graduate',
        );
        expect(renderHook(() => useFeedStarterPrompt('GRADUATION'), { wrapper: wrap('el') }).result.current).toBe(
            'Τότε και τώρα: μια παλιά σας φωτογραφία μαζί',
        );
    });

    it('gives other types none', () => {
        expect(renderHook(() => useFeedStarterPrompt('WEDDING'), { wrapper: wrap('en') }).result.current).toBeUndefined();
        expect(renderHook(() => useFeedStarterPrompt(undefined), { wrapper: wrap('en') }).result.current).toBeUndefined();
    });
});
