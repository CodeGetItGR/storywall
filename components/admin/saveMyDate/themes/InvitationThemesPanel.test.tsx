import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvitationThemesPanel } from '@/components/admin/saveMyDate/themes/InvitationThemesPanel';
import type { AdminInvitationThemeSummaryDto } from '@/lib/adminInvitationThemes';

const catalog = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, string>) => (values?.name ? `${key}:${values.name}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useInvitationThemesCatalog', () => ({ useInvitationThemesCatalog: () => catalog.current }));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock('@/components/admin/saveMyDate/themes/InvitationThemeDrawer', () => ({
    InvitationThemeDrawer: ({ themeId }: { themeId: string }) => <div data-testid="drawer">{themeId}</div>,
}));
vi.mock('@/components/admin/saveMyDate/themes/InvitationThemeNameModal', () => ({
    InvitationThemeNameModal: ({ state }: { state: { mode: string } }) => <div data-testid="name-modal">{state.mode}</div>,
}));
vi.mock('@/components/admin/saveMyDate/themes/InvitationThemePreviewOverlay', () => ({
    InvitationThemePreviewOverlay: ({ themeId }: { themeId: string }) => <div data-testid="preview">{themeId}</div>,
}));

const THEME: AdminInvitationThemeSummaryDto = {
    id: 't1',
    eventType: 'WEDDING',
    status: 'HIDDEN',
    name: 'Γάμος 001',
    slug: 'gamos-001',
    code: null,
    sortOrder: 0,
    revision: 1,
    cardThumbUrl: 'https://cdn.test/thumb.webp',
    updatedAt: '2026-11-01T10:00:00Z',
};

function state(overrides: Record<string, unknown> = {}) {
    catalog.current = {
        themes: [THEME],
        visibleThemes: [THEME],
        canReorder: false,
        reorderHint: undefined,
        moveError: null,
        moveTheme: vi.fn(),
        reorderTheme: vi.fn(),
        eventTypeLabels: { WEDDING: 'Wedding' },
        eventTypeFilterOptions: [
            { value: 'ALL', label: 'filterAll' },
            { value: 'WEDDING', label: 'Wedding' },
            { value: 'BAPTISM', label: 'Baptism' },
        ],
        statusFilterOptions: [
            { value: 'ALL', label: 'filterAll' },
            { value: 'HIDDEN', label: 'status.HIDDEN' },
        ],
        createEventTypes: [{ key: 'WEDDING', label: 'Wedding' }],
        search: '',
        status: 'ALL',
        eventType: 'ALL',
        setStatus: vi.fn(),
        setEventType: vi.fn(),
        handleSearchChange: vi.fn(),
        isLoading: false,
        error: null,
        drawerThemeId: null,
        drawerTitle: '',
        openDrawer: vi.fn(),
        closeDrawer: vi.fn(),
        nameModal: null,
        openCreate: vi.fn(),
        openDuplicate: vi.fn(),
        closeNameModal: vi.fn(),
        handleNamed: vi.fn(),
        previewThemeId: null,
        openPreview: vi.fn(),
        closePreview: vi.fn(),
        ...overrides,
    };
}

afterEach(cleanup);

describe('InvitationThemesPanel', () => {
    it('lists a theme with its thumbnail, event type, status, slug and date', () => {
        state();
        render(<InvitationThemesPanel />);
        expect(screen.getByText('Γάμος 001')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'invitationThemeThumbnail:Γάμος 001' })).toBeInTheDocument();
        expect(screen.getAllByText('Wedding').length).toBeGreaterThan(0);
        expect(screen.getAllByText('HIDDEN').length).toBeGreaterThan(0);
        expect(screen.getByText('gamos-001')).toBeInTheDocument();
        expect(screen.getByText('Nov 1, 2026')).toBeInTheDocument();
    });

    it('opens a theme to edit or preview, and a new theme', () => {
        state();
        render(<InvitationThemesPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'edit:Γάμος 001' }));
        fireEvent.click(screen.getByRole('button', { name: 'preview:Γάμος 001' }));
        fireEvent.click(screen.getByRole('button', { name: 'create' }));
        const current = catalog.current as Record<string, ReturnType<typeof vi.fn>>;
        expect(current.openDrawer).toHaveBeenCalledWith('t1');
        expect(current.openPreview).toHaveBeenCalledWith('t1');
        expect(current.openCreate).toHaveBeenCalled();
    });

    it('moves a theme with its arrows once they are on, and says why they are off', () => {
        const second = { ...THEME, id: 't2', name: 'Γάμος 002', slug: 'gamos-002', sortOrder: 1 };
        state({ visibleThemes: [THEME, second], canReorder: true });
        const { unmount } = render(<InvitationThemesPanel />);
        expect(screen.getByRole('button', { name: 'moveUp:Γάμος 001' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'moveDown:Γάμος 001' }));
        expect((catalog.current as Record<string, ReturnType<typeof vi.fn>>).moveTheme).toHaveBeenCalledWith('t1', 'down');
        expect(screen.getByRole('button', { name: 'drag:Γάμος 002' })).toBeEnabled();
        unmount();

        state({ visibleThemes: [THEME, second], canReorder: false, reorderHint: 'order.pickKind' });
        render(<InvitationThemesPanel />);
        expect(screen.getByRole('button', { name: 'moveDown:Γάμος 001' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'drag:Γάμος 001' })).toBeDisabled();
        expect(screen.getAllByTitle('order.pickKind')).toHaveLength(2);
    });

    it('shows a failed move', () => {
        state({ moveError: new Error('offline') });
        render(<InvitationThemesPanel />);
        expect(screen.getByText(/^errors./)).toBeInTheDocument();
    });

    it('filters by event type and status', () => {
        state();
        render(<InvitationThemesPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'Baptism' }));
        fireEvent.click(screen.getByRole('button', { name: 'status.HIDDEN' }));
        const current = catalog.current as Record<string, ReturnType<typeof vi.fn>>;
        expect(current.setEventType).toHaveBeenCalledWith('BAPTISM');
        expect(current.setStatus).toHaveBeenCalledWith('HIDDEN');
    });

    it('hides the event type filter when there is only one type', () => {
        state({ eventTypeFilterOptions: [{ value: 'ALL', label: 'filterAll' }, { value: 'WEDDING', label: 'Wedding' }] });
        render(<InvitationThemesPanel />);
        expect(screen.queryByRole('group', { name: 'columns.eventType' })).not.toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'columns.status' })).toBeInTheDocument();
    });

    it('says when nothing matches, and when there are no themes yet', () => {
        state({ visibleThemes: [] });
        const { unmount } = render(<InvitationThemesPanel />);
        expect(screen.getByText('noMatches')).toBeInTheDocument();
        unmount();
        state({ themes: [], visibleThemes: [] });
        render(<InvitationThemesPanel />);
        expect(screen.getByText('empty')).toBeInTheDocument();
    });

    it('shows the loading state, then a load error', () => {
        state({ isLoading: true });
        const { unmount } = render(<InvitationThemesPanel />);
        expect(screen.getByText('loading')).toBeInTheDocument();
        unmount();
        state({ error: new Error('offline') });
        render(<InvitationThemesPanel />);
        expect(screen.getByText(/^errors\./)).toBeInTheDocument();
    });

    it('renders the drawer, the name modal and the preview it is asked for', () => {
        state({ drawerThemeId: 't1', nameModal: { mode: 'create' }, previewThemeId: 't1' });
        render(<InvitationThemesPanel />);
        expect(screen.getByTestId('drawer')).toHaveTextContent('t1');
        expect(screen.getByTestId('name-modal')).toHaveTextContent('create');
        expect(screen.getByTestId('preview')).toHaveTextContent('t1');
    });
});
