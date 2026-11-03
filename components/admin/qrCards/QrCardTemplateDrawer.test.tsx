import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrCardTemplateDrawer } from '@/components/admin/qrCards/QrCardTemplateDrawer';
import { ApiError } from '@/lib/api/client';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import { PLAIN_QR_CARD_STYLE } from '@/lib/qrCard';

const drawerState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

// Renders "key" alone, or "key {json}" when the message takes values, so tests can see what was passed.
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ title, children, footer }: { title: ReactNode; children: ReactNode; footer: ReactNode }) => (
        <div data-testid="drawer">
            <h2>{title}</h2>
            {children}
            {footer}
        </div>
    ),
}));
vi.mock('@/components/admin/qrCards/QrCardTemplatePreview', () => ({
    QrCardTemplatePreview: ({ title }: { title: string }) => <div data-testid="preview" data-title={title} />,
}));
vi.mock('@/components/admin/qrCards/layoutEditor/QrCardLayoutEditor', () => ({
    QrCardLayoutEditor: () => <div data-testid="layout-editor" />,
}));
vi.mock('@/hooks/useQrCardTemplateDrawer', () => ({ useQrCardTemplateDrawer: () => drawerState.current }));

const LINEN: AdminQrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    eventTypes: ['WEDDING'],
    sortOrder: 0,
    archived: false,
    artworkUrl: '/api/qr-card-artwork/t1/1',
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: false,
    layout: null,
    artworkWidth: null,
};

const EVENT_TYPES = [
    { eventTypeKey: 'WEDDING' as const, label: 'Wedding' },
    { eventTypeKey: 'BAPTISM' as const, label: 'Baptism' },
];

function state(overrides: Record<string, unknown> = {}) {
    drawerState.current = {
        isCreate: false,
        savedName: 'Linen',
        draft: {
            nameEn: 'Linen',
            nameEl: 'Λινό',
            eventTypes: ['WEDDING'],
            archived: false,
        },
        errors: {},
        failure: null,
        availability: 'AVAILABLE',
        previewStyle: PLAIN_QR_CARD_STYLE,
        previewTitle: 'Linen',
        isSaving: false,
        savedTemplate: LINEN,
        layoutEditorOpen: false,
        openLayoutEditor: vi.fn(),
        closeLayoutEditor: vi.fn(),
        handleLayoutSaved: vi.fn(),
        handleFieldChange: vi.fn(),
        handleEventTypeChange: vi.fn(),
        handleAvailabilityChange: vi.fn(),
        handleSubmit: vi.fn((event: Event) => event.preventDefault()),
        ...overrides,
    };
    return drawerState.current;
}

function renderDrawer(template: AdminQrCardTemplateDto | null = LINEN) {
    render(<QrCardTemplateDrawer template={template} sortOrder={0} eventTypes={EVENT_TYPES} onCloseAction={vi.fn()} onDuplicatedAction={vi.fn()} />);
}

afterEach(cleanup);

describe('QrCardTemplateDrawer', () => {
    it("shows the saved design's fields", () => {
        state();
        renderDrawer();
        expect(screen.getByRole('heading', { name: 'Linen' })).toBeInTheDocument();
        expect(screen.getByDisplayValue('Λινό')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Wedding' })).toBeChecked();
        // The look is the layout editor's.
        expect(screen.queryByLabelText('codeColorHex')).toBeNull();
        expect(screen.queryByText('artwork')).toBeNull();
    });

    it('titles a design saved from a create with its name', () => {
        state({ isCreate: false, savedName: 'Marble' });
        renderDrawer(null);
        expect(screen.getByRole('heading', { name: 'Marble' })).toBeInTheDocument();
    });

    it("shows the server's detail for a rejected name", () => {
        state({ failure: { kind: 'other', error: new ApiError(400, { errorCode: 3091, detail: 'The Greek name is too long.' }) } });
        renderDrawer();
        expect(screen.getByRole('alert')).toHaveTextContent('The Greek name is too long.');
    });

    it('asks for availability only on a saved design', () => {
        state({ isCreate: true });
        renderDrawer(null);
        expect(screen.getByRole('heading', { name: 'createTitle' })).toBeInTheDocument();
        expect(screen.queryByText('availability')).toBeNull();
    });

    it('opens the layout editor for a saved design', () => {
        state();
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        expect(drawerState.current.openLayoutEditor).toHaveBeenCalled();
    });

    it('leaves the design button off a new design, whose save opens the editor', () => {
        state({ isCreate: true, savedTemplate: null });
        renderDrawer(null);
        expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
    });

    it('shows the editor while it is open', () => {
        state({ layoutEditorOpen: true });
        renderDrawer();
        expect(screen.getByTestId('layout-editor')).toBeInTheDocument();
    });
});
