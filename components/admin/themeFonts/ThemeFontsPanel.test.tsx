import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeFontsPanel } from '@/components/admin/themeFonts/ThemeFontsPanel';
import type { AdminThemeFontDto } from '@/lib/api/types';

const query = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/hooks/useAdminThemeFonts', () => ({ useAdminThemeFonts: () => query.current }));
vi.mock('@/components/admin/themeFonts/ThemeFontDrawer', () => ({
    ThemeFontDrawer: ({ font }: { font: AdminThemeFontDto | null }) => <div data-testid="drawer">{font?.key ?? 'new'}</div>,
}));

const READY: AdminThemeFontDto = {
    id: 'f1',
    key: 'gfs-didot',
    familyName: 'GFS Didot',
    fallback: 'serif',
    archived: false,
    url: '/api/theme-fonts/gfs-didot/1.woff2',
    presetCount: 2,
};
const NO_FILE: AdminThemeFontDto = {
    ...READY,
    id: 'f2',
    key: 'comfortaa',
    familyName: 'Comfortaa',
    fallback: 'sans-serif',
    url: null,
    presetCount: 0,
};

function state(overrides: Record<string, unknown> = {}) {
    query.current = { data: [READY, NO_FILE], isLoading: false, error: null, ...overrides };
}

afterEach(cleanup);

describe('ThemeFontsPanel', () => {
    it('lists fonts with their fallback, preset count and status', () => {
        state();
        render(<ThemeFontsPanel />);
        expect(screen.getByText('GFS Didot')).toHaveStyle({ fontFamily: '"theme-gfs-didot", serif' });
        expect(screen.getByText('Comfortaa')).toHaveStyle({ fontFamily: 'sans-serif' });
        expect(screen.getByText('status.READY')).toBeInTheDocument();
        expect(screen.getByText('status.NEEDS_FILE')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('opens the drawer for a font, and for a new one', () => {
        state();
        render(<ThemeFontsPanel />);
        expect(screen.queryByTestId('drawer')).toBeNull();
        fireEvent.click(screen.getAllByRole('button', { name: 'edit' })[0]);
        expect(screen.getByTestId('drawer')).toHaveTextContent('gfs-didot');
    });

    it('shows loading, error and empty states', () => {
        state({ data: undefined, isLoading: true });
        render(<ThemeFontsPanel />);
        expect(screen.getByText('loading')).toBeInTheDocument();
        cleanup();

        state({ data: undefined, error: new Error('x') });
        render(<ThemeFontsPanel />);
        expect(screen.getByText('errors.generic')).toBeInTheDocument();
        cleanup();

        state({ data: [] });
        render(<ThemeFontsPanel />);
        expect(screen.getByText('empty')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'create' }));
        expect(screen.getByTestId('drawer')).toHaveTextContent('new');
    });
});
