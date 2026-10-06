import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemePresetsPanel } from '@/components/admin/themePresets/ThemePresetsPanel';
import type { AdminThemePresetDto } from '@/lib/api/types';

const catalog = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/hooks/useThemePresetsCatalog', () => ({ useThemePresetsCatalog: () => catalog.current }));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: () => null }));
vi.mock('@/components/admin/themePresets/ThemePresetDrawer', () => ({
    ThemePresetDrawer: ({ preset }: { preset: AdminThemePresetDto | null }) => <div data-testid="drawer">{preset?.key ?? 'new'}</div>,
}));

const PRESET: AdminThemePresetDto = {
    id: 'p1',
    key: 'dino-mint',
    name: { en: 'Dino', el: 'Δεινόσαυρος' },
    backgroundColor: '#BFE6E2',
    illustrationUrl: null,
    eventTypes: ['BAPTISM'],
    sortOrder: 0,
    archived: false,
    titleColor: null,
    headingFont: null,
};

function state(overrides: Record<string, unknown> = {}) {
    catalog.current = {
        presets: [PRESET],
        visiblePresets: [PRESET],
        eventTypes: [{ eventTypeKey: 'BAPTISM', label: 'Baptism' }],
        eventTypeLabels: { BAPTISM: 'Baptism' },
        search: '',
        status: 'ALL',
        setStatus: vi.fn(),
        canReorder: true,
        moveError: null,
        drawer: { open: false },
        createSortOrder: 1,
        isLoading: false,
        error: null,
        handleSearchChange: vi.fn(),
        openCreate: vi.fn(),
        openEdit: vi.fn(),
        closeDrawer: vi.fn(),
        movePreset: vi.fn(),
        ...overrides,
    };
}

afterEach(cleanup);

describe('ThemePresetsPanel', () => {
    it('lists presets with their event types and status', () => {
        state();
        render(<ThemePresetsPanel />);
        expect(screen.getByText('Dino')).toBeInTheDocument();
        expect(screen.getByText('Baptism')).toBeInTheDocument();
        expect(screen.getByText('status.NEEDS_ILLUSTRATION')).toBeInTheDocument();
    });

    it('opens the drawer to create and to edit', () => {
        const openCreate = vi.fn();
        const openEdit = vi.fn();
        state({ openCreate, openEdit });
        render(<ThemePresetsPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'create' }));
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        expect(openCreate).toHaveBeenCalled();
        expect(openEdit).toHaveBeenCalledWith('p1');
    });

    it('renders the drawer for the selected preset', () => {
        state({ drawer: { open: true, preset: PRESET } });
        render(<ThemePresetsPanel />);
        expect(screen.getByTestId('drawer')).toHaveTextContent('dino-mint');
    });

    it('filters by status', () => {
        const setStatus = vi.fn();
        state({ setStatus });
        render(<ThemePresetsPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'filters.ARCHIVED' }));
        expect(setStatus).toHaveBeenCalledWith('ARCHIVED');
    });

    it('says when there are no presets yet', () => {
        state({ presets: [], visiblePresets: [] });
        render(<ThemePresetsPanel />);
        expect(screen.getByText('empty')).toBeInTheDocument();
    });
});
