import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useSaveMyDateAdminNav } from '@/hooks/useSaveMyDateAdminNav';
import messages from '@/messages/en.json';

const nav = vi.hoisted(() => ({ pathname: '/admin/save-my-date/themes' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

function wrapper({ children }: { children: ReactNode }) {
    return (
        <NextIntlClientProvider locale="en" messages={messages}>
            {children}
        </NextIntlClientProvider>
    );
}

describe('useSaveMyDateAdminNav', () => {
    it('lists every screen under Catalog and marks the open section', () => {
        nav.pathname = '/admin/save-my-date/themes';
        const { result } = renderHook(useSaveMyDateAdminNav, { wrapper });
        expect(result.current.groups.map((group) => [group.label, group.items.map((item) => item.label)])).toEqual([
            ['Catalog', ['Themes', 'Fonts', 'Font pairings', 'Texts']],
        ]);
        expect(result.current.groups[0].items[0]).toMatchObject({ href: '/admin/save-my-date/themes', active: true });
        expect(result.current.activeLabel).toBe('Themes');
    });

    it('marks the fonts screen, and not the pairings, on /fonts', () => {
        nav.pathname = '/admin/save-my-date/fonts';
        const { result } = renderHook(useSaveMyDateAdminNav, { wrapper });
        expect(result.current.groups[0].items.filter((item) => item.active).map((item) => item.href)).toEqual(['/admin/save-my-date/fonts']);
        expect(result.current.activeLabel).toBe('Fonts');
    });

    it('marks nothing on an address outside its sections', () => {
        nav.pathname = '/admin/save-my-date/themes-old';
        const { result } = renderHook(useSaveMyDateAdminNav, { wrapper });
        expect(result.current.activeLabel).toBeUndefined();
    });
});
