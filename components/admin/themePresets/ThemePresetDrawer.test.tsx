import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemePresetDrawer } from '@/components/admin/themePresets/ThemePresetDrawer';
import type { AdminThemePresetDto } from '@/lib/api/types';

const drawerState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ title, children, footer }: { title: ReactNode; children: ReactNode; footer: ReactNode }) => (
        <div>
            <h2>{title}</h2>
            {children}
            {footer}
        </div>
    ),
}));
vi.mock('@/components/admin/themePresets/ThemePresetPreview', () => ({
    ThemePresetPreview: ({ title, backgroundColor }: { title: string; backgroundColor: string | null }) => (
        <div data-testid="preview" data-title={title} data-color={backgroundColor ?? ''} />
    ),
}));
vi.mock('@/hooks/useThemePresetDrawer', () => ({ useThemePresetDrawer: () => drawerState.current }));

const PRESET: AdminThemePresetDto = {
    id: 'p1',
    key: 'dino-mint',
    name: { en: 'Dino', el: 'Δεινόσαυρος' },
    backgroundColor: '#BFE6E2',
    illustrationUrl: 'https://media.example/dino.webp',
    eventTypes: ['BAPTISM'],
    sortOrder: 0,
    archived: false,
    titleColor: null,
    headingFont: null,
};

const EVENT_TYPES = [
    { eventTypeKey: 'BAPTISM' as const, label: 'Baptism' },
    { eventTypeKey: 'BABY_SHOWER' as const, label: 'Baby shower' },
];

function state(overrides: Record<string, unknown> = {}) {
    drawerState.current = {
        isCreate: false,
        draft: { key: 'dino-mint', nameEn: 'Dino', nameEl: 'Δεινόσαυρος', backgroundColor: '#BFE6E2', eventTypes: ['BAPTISM'], archived: false },
        errors: {},
        failure: null,
        fileError: null,
        hasPendingFile: false,
        colorInputValue: '#bfe6e2',
        availability: 'AVAILABLE',
        contrastRatio: 8.2,
        previewColor: '#BFE6E2',
        previewIllustrationUrl: PRESET.illustrationUrl,
        previewTitle: 'Dino',
        isSaving: false,
        handleFieldChange: vi.fn(),
        handleEventTypeChange: vi.fn(),
        handleAvailabilityChange: vi.fn(),
        handleFileChange: vi.fn(),
        handleSubmit: vi.fn((event: Event) => event.preventDefault()),
        ...overrides,
    };
}

function renderDrawer(preset: AdminThemePresetDto | null = PRESET) {
    render(<ThemePresetDrawer preset={preset} sortOrder={0} eventTypes={EVENT_TYPES} onCloseAction={vi.fn()} />);
}

afterEach(cleanup);

describe('ThemePresetDrawer', () => {
    it('shows the key read-only and the availability control when editing', () => {
        state();
        renderDrawer();
        expect(screen.getByText('dino-mint')).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: /key/ })).toBeNull();
        expect(screen.getByRole('button', { name: 'archived' })).toBeInTheDocument();
    });

    it('asks for a key and hides availability when creating', () => {
        state({ isCreate: true, previewTitle: '' });
        renderDrawer(null);
        expect(screen.getByRole('heading', { name: 'createTitle' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'archived' })).toBeNull();
        expect(screen.getByTestId('preview').dataset.title).toBe('sampleTitle');
    });

    it('ticks the event types the preset is offered to and reports toggles', () => {
        const handleEventTypeChange = vi.fn();
        state({ handleEventTypeChange });
        renderDrawer();
        expect(screen.getByRole('checkbox', { name: 'Baptism' })).toBeChecked();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Baby shower' }));
        expect(handleEventTypeChange).toHaveBeenCalled();
    });

    it('shows a taken key on the key field', () => {
        state({ isCreate: true, failure: { kind: 'keyTaken' } });
        renderDrawer(null);
        expect(screen.getByText('keyTaken')).toBeInTheDocument();
    });

    it('shows a refused file', () => {
        state({ fileError: 'size' });
        renderDrawer();
        expect(screen.getByText('illustrationSize')).toBeInTheDocument();
    });

    it('feeds the live preview from the draft', () => {
        state({ previewColor: '#FFE4B5' });
        renderDrawer();
        expect(screen.getByTestId('preview').dataset.color).toBe('#FFE4B5');
    });

    it('shows the contrast against the text, and blocks a colour that is too dark', () => {
        state({ contrastRatio: 8.2 });
        renderDrawer();
        expect(screen.getByText('contrastOk')).toBeInTheDocument();
        cleanup();

        state({ contrastRatio: 3.6, errors: { backgroundContrast: true } });
        renderDrawer();
        expect(screen.queryByText('contrastLow')).toBeNull();
        expect(screen.getByRole('alert')).toHaveTextContent('backgroundContrastInvalid');
        cleanup();

        // Before a blocked save the live hint is the only message.
        state({ contrastRatio: 3.6 });
        renderDrawer();
        expect(screen.getByText('contrastLow')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('shows the server message when it rejects the draft', () => {
        const error = Object.assign(new Error('x'), {});
        state({ failure: { kind: 'other', error } });
        renderDrawer();
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });
});
