import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LandingCategoriesPanel } from '@/components/admin/landingCategories/LandingCategoriesPanel';
import type { AdminLandingCategoryDto } from '@/lib/api/types';

const state = vi.hoisted(() => ({
    categories: { data: [] as unknown[], isLoading: false, error: null as unknown },
    config: { data: { planTiers: [], eventTypes: [{ eventTypeKey: 'WEDDING' }] } as unknown },
    eventTypes: {
        data: [
            { eventTypeKey: 'WEDDING', name: { en: 'Wedding' }, sortOrder: 0 },
            { eventTypeKey: 'BIRTHDAY', name: { en: 'Birthday' }, sortOrder: 1 },
        ] as unknown[],
    },
    move: vi.fn(),
    drawer: vi.fn(),
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(',')}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useAdminLandingCategories', () => ({
    useAdminLandingCategories: () => state.categories,
    useLandingCategoryMove: () => ({ move: state.move, isPending: false, error: null }),
}));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => state.config }));
vi.mock('@/hooks/useAdmin', () => ({ useAdminPlatformEventTypes: () => state.eventTypes }));
vi.mock('@/components/admin/landingCategories/LandingCategoryDrawer', () => ({
    LandingCategoryDrawer: (props: unknown) => {
        state.drawer(props);
        return null;
    },
}));

function category(overrides: Partial<AdminLandingCategoryDto>): AdminLandingCategoryDto {
    return { id: 'a', name: { en: 'Weddings' }, description: {}, sortOrder: 0, isVisible: true, isDefault: false, eventTypeKeys: [], ...overrides };
}

beforeEach(() => {
    state.drawer.mockReset();
    state.move.mockReset();
    state.categories = { data: [], isLoading: false, error: null };
});
afterEach(cleanup);

describe('LandingCategoriesPanel', () => {
    it('shows each category in display order with its types, pills and warnings, and the unassigned types', () => {
        state.categories.data = [
            category({ id: 'b', name: { en: 'Parties' }, sortOrder: 1, isVisible: false }),
            category({ id: 'a', isDefault: true, eventTypeKeys: ['WEDDING'] }),
        ];
        render(<LandingCategoriesPanel />);

        const names = screen.getAllByTestId('landing-category-name').map((node) => node.textContent);
        expect(names).toEqual(['Weddings', 'Parties']);
        expect(screen.getByText('landingCategories.defaultPill')).toBeInTheDocument();
        expect(screen.getByText('landingCategories.hiddenPill')).toBeInTheDocument();
        expect(screen.getByText('Wedding')).toBeInTheDocument();
        // Weddings has an enabled type but no plan; Parties has no type at all.
        expect(screen.getAllByText('landingCategories.warnNoVisiblePlan')).toHaveLength(1);
        expect(screen.getAllByText('landingCategories.warnNoEnabledType')).toHaveLength(1);
        expect(screen.getByText('landingCategories.unassigned')).toBeInTheDocument();
        expect(screen.getByText('Birthday')).toBeInTheDocument();
    });

    it('names the codes of drifted shared plans', () => {
        const plan = (code: string, eventTypeKey: string, priceCurrency: string) => ({
            code,
            scope: 'EVENT',
            isPublic: true,
            isAssignable: true,
            sortOrder: 0,
            name: 'Gold',
            priceCurrency,
            discountPercent: null,
            discountLabel: null,
            discountStartsAt: null,
            discountEndsAt: null,
            moduleKeys: [],
            moduleConfigs: {},
            eventTypeKey,
            sharedGroupKey: 'g',
            extensionOptions: [],
            initialOptions: [{ id: 'o', kind: 'INITIAL', months: 3, priceAmountMinor: 100, sortOrder: 0, active: true }],
        });
        const previous = state.config;
        state.config = {
            data: {
                planTiers: [plan('gold-w', 'WEDDING', 'EUR'), plan('gold-b', 'BIRTHDAY', 'USD')],
                eventTypes: [{ eventTypeKey: 'WEDDING' }, { eventTypeKey: 'BIRTHDAY' }],
            },
        };
        state.categories.data = [category({ eventTypeKeys: ['WEDDING', 'BIRTHDAY'] })];
        render(<LandingCategoriesPanel />);
        expect(screen.getByText('landingCategories.warnDrifted:gold-w, gold-b')).toBeInTheDocument();
        state.config = previous;
    });

    it('moves a category with the arrows', () => {
        state.categories.data = [category({ id: 'a' }), category({ id: 'b', name: { en: 'Parties' }, sortOrder: 1 })];
        render(<LandingCategoriesPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'moveDown:Weddings' }));
        expect(state.move).toHaveBeenCalledWith('a', 'down');
    });

    it('opens the drawer to create and to edit', () => {
        state.categories.data = [category({})];
        render(<LandingCategoriesPanel />);
        expect(state.drawer).toHaveBeenLastCalledWith(expect.objectContaining({ open: false }));

        fireEvent.click(screen.getByRole('button', { name: 'landingCategories.create' }));
        expect(state.drawer).toHaveBeenLastCalledWith(expect.objectContaining({ open: true, category: null }));

        fireEvent.click(screen.getByRole('button', { name: 'eventTypes.edit Weddings' }));
        expect(state.drawer).toHaveBeenLastCalledWith(expect.objectContaining({ open: true, category: expect.objectContaining({ id: 'a' }) }));
    });

    it('shows the empty and error states', () => {
        render(<LandingCategoriesPanel />);
        expect(screen.getByText('landingCategories.empty')).toBeInTheDocument();
        cleanup();

        state.categories = { data: undefined as unknown as unknown[], isLoading: false, error: new Error('x') };
        render(<LandingCategoriesPanel />);
        expect(screen.getByText('errors.generic')).toBeInTheDocument();
    });
});
