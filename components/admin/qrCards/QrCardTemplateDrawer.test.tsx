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
            textColor: '#5A3E2B',
            headingFontId: '',
            codeColor: '#1F3A5A',
            centerLogo: false,
        },
        errors: {},
        failure: null,
        fileError: null,
        hasPendingFile: false,
        textColorInputValue: '#5a3e2b',
        codeColorInputValue: '#1f3a5a',
        codeContrastRatio: 11.2,
        availability: 'AVAILABLE',
        previewStyle: PLAIN_QR_CARD_STYLE,
        previewTitle: 'Linen',
        fontOptions: [],
        hasUsableFonts: true,
        fontsStatus: 'ready',
        isSaving: false,
        savedTemplate: LINEN,
        layoutEditorOpen: false,
        openLayoutEditor: vi.fn(),
        closeLayoutEditor: vi.fn(),
        handleLayoutSaved: vi.fn(),
        handleFieldChange: vi.fn(),
        handleEventTypeChange: vi.fn(),
        handleCenterLogoChange: vi.fn(),
        handleAvailabilityChange: vi.fn(),
        handleFileChange: vi.fn(),
        handleSubmit: vi.fn((event: Event) => event.preventDefault()),
        ...overrides,
    };
    return drawerState.current;
}

function renderDrawer(template: AdminQrCardTemplateDto | null = LINEN) {
    render(<QrCardTemplateDrawer template={template} sortOrder={0} eventTypes={EVENT_TYPES} onCloseAction={vi.fn()} />);
}

afterEach(cleanup);

describe('QrCardTemplateDrawer', () => {
    it("shows the saved design's fields", () => {
        state();
        renderDrawer();
        expect(screen.getByRole('heading', { name: 'Linen' })).toBeInTheDocument();
        expect(screen.getByDisplayValue('Λινό')).toBeInTheDocument();
        expect(screen.getByLabelText('codeColorHex')).toHaveValue('#1F3A5A');
        expect(screen.getByRole('checkbox', { name: 'Wedding' })).toBeChecked();
        expect(screen.getByText('codeContrastOk {"ratio":"11.20"}')).toBeInTheDocument();
    });

    it('warns while the code colour is too light', () => {
        state({ codeContrastRatio: 3.2 });
        renderDrawer();
        expect(screen.getByText('codeContrastLow {"ratio":"3.20","min":"4.5"}')).toBeInTheDocument();
    });

    it('ties the contrast hint to the code colour inputs', () => {
        state({ codeContrastRatio: 3.2 });
        renderDrawer();
        const hint = 'codeContrastLow {"ratio":"3.20","min":"4.5"}';
        expect(screen.getByLabelText('codeColorHex')).toHaveAccessibleDescription(hint);
        expect(screen.getByLabelText('codeColor')).toHaveAccessibleDescription(hint);
    });

    it('titles a design saved from a create with its name', () => {
        state({ isCreate: false, savedName: 'Marble' });
        renderDrawer(null);
        expect(screen.getByRole('heading', { name: 'Marble' })).toBeInTheDocument();
    });

    it('turns the logo on', () => {
        const form = state();
        renderDrawer();
        fireEvent.click(screen.getByRole('switch', { name: 'centerLogo' }));
        expect(form.handleCenterLogoChange).toHaveBeenCalledWith(true);
    });

    it("shows the server's detail for rejected artwork", () => {
        state({ failure: { kind: 'other', error: new ApiError(400, { errorCode: 3111, detail: 'The artwork must be A6 portrait.' }) } });
        renderDrawer();
        expect(screen.getByRole('alert')).toHaveTextContent('The artwork must be A6 portrait.');
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

    it('asks to save a new design before its layout', () => {
        state({ isCreate: true, savedTemplate: null });
        renderDrawer(null);
        expect(screen.getByRole('button', { name: 'edit' })).toBeDisabled();
        expect(screen.getByText('editSaveFirst')).toBeInTheDocument();
    });

    it('shows the editor while it is open', () => {
        state({ layoutEditorOpen: true });
        renderDrawer();
        expect(screen.getByTestId('layout-editor')).toBeInTheDocument();
    });
});
