import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePartnerCodeLink } from '@/hooks/usePartnerCodeLink';
import { readPartnerCode, savePartnerCode } from '@/lib/partnerCodeLink';

const navigation = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }));

function visit(path: string) {
    window.history.replaceState(null, '', path);
    navigation.pathname = new URL(path, window.location.origin).pathname;
}

afterEach(() => {
    cleanup();
    localStorage.clear();
});

describe('usePartnerCodeLink', () => {
    it('saves the code from the link and takes it out of the address bar', () => {
        visit('/weddings?utm_source=shop&promo=CARDS10');
        renderHook(() => usePartnerCodeLink());

        expect(readPartnerCode()).toBe('CARDS10');
        expect(`${window.location.pathname}${window.location.search}`).toBe('/weddings?utm_source=shop');
    });

    it('keeps a saved code on a page without one', () => {
        savePartnerCode('CARDS10');
        visit('/register');
        renderHook(() => usePartnerCodeLink());

        expect(readPartnerCode()).toBe('CARDS10');
    });

    it('lets a newer link replace the saved code', () => {
        savePartnerCode('OLD');
        visit('/?promo=NEW');
        renderHook(() => usePartnerCodeLink());

        expect(readPartnerCode()).toBe('NEW');
    });
});
