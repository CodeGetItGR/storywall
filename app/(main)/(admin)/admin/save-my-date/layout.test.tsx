import { afterEach, describe, expect, it, vi } from 'vitest';

const release = vi.hoisted(() => ({ shown: true }));
vi.mock('@/lib/saveMyDateRelease', () => ({ showsSaveMyDate: () => release.shown }));
vi.mock('next/navigation', () => ({
    notFound: () => {
        throw new Error('NEXT_NOT_FOUND');
    },
    redirect: (path: string) => {
        throw new Error(`NEXT_REDIRECT ${path}`);
    },
}));
vi.mock('@/components/admin/saveMyDate/SaveMyDateAdminShell', () => ({ SaveMyDateAdminShell: () => null }));

import SaveMyDateAdminLayout, { metadata } from './layout';
import SaveMyDateAdminPage from './page';

afterEach(() => {
    release.shown = true;
});

// KAN-201: the Save my date admin follows Save my date's release switch, and is never indexed.
describe('Save my date admin route', () => {
    it('404s where Save my date is hidden', () => {
        release.shown = false;
        expect(() => SaveMyDateAdminLayout({ children: null })).toThrow('NEXT_NOT_FOUND');
    });

    it('renders where Save my date shows, noindex', () => {
        expect(SaveMyDateAdminLayout({ children: null })).toBeTruthy();
        expect(metadata.robots).toMatchObject({ index: false });
    });

    it('opens on Themes', () => {
        expect(() => SaveMyDateAdminPage()).toThrow('NEXT_REDIRECT /admin/save-my-date/themes');
    });
});
