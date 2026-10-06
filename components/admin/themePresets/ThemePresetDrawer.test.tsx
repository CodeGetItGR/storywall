import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemePresetDrawer } from '@/components/admin/themePresets/ThemePresetDrawer';
import { ApiError } from '@/lib/api/client';
import type { AdminThemePresetDto, EventThemeFontDto } from '@/lib/api/types';

const drawerState = vi.hoisted(() => ({ current: {} as Record<string, unknown>, locale: 'en' }));

// Renders "key" alone, or "key {json}" when the message takes values, so tests can see what was passed.
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
    useLocale: () => drawerState.locale,
}));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({
        title,
        children,
        footer,
        closeDisabled,
    }: {
        title: ReactNode;
        children: ReactNode;
        footer: ReactNode;
        closeDisabled?: boolean;
    }) => (
        <div data-testid="drawer" data-close-disabled={String(Boolean(closeDisabled))}>
            <h2>{title}</h2>
            {children}
            {footer}
        </div>
    ),
}));
vi.mock('@/components/admin/themePresets/ThemePresetPreview', () => ({
    ThemePresetPreview: ({
        title,
        backgroundColor,
        titleColor,
        headingFont,
    }: {
        title: string;
        backgroundColor: string | null;
        titleColor: string | null;
        headingFont: EventThemeFontDto | null;
    }) => (
        <div
            data-testid="preview"
            data-title={title}
            data-color={backgroundColor ?? ''}
            data-title-color={titleColor ?? ''}
            data-font={headingFont?.key ?? ''}
        />
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
        draft: {
            key: 'dino-mint',
            nameEn: 'Dino',
            nameEl: 'Δεινόσαυρος',
            backgroundColor: '#BFE6E2',
            eventTypes: ['BAPTISM'],
            archived: false,
            titleColor: '',
            headingFontId: '',
        },
        errors: {},
        failure: null,
        fileError: null,
        hasPendingFile: false,
        colorInputValue: '#bfe6e2',
        availability: 'AVAILABLE',
        contrastRatio: 8.2,
        previewColor: '#BFE6E2',
        titleContrastRatio: null,
        titleColorInputValue: '#241f1a',
        previewTitleColor: null,
        previewFont: null,
        fontOptions: [{ id: 'f1', key: 'alegreya', familyName: 'Alegreya', status: 'live' }],
        hasUsableFonts: true,
        fontsStatus: 'ready',
        previewIllustrationUrl: PRESET.illustrationUrl,
        previewTitle: 'Dino',
        isSaving: false,
        handleFieldChange: vi.fn(),
        handleUseInk: vi.fn(),
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

afterEach(() => {
    cleanup();
    drawerState.locale = 'en';
});

function draftWith(fields: Record<string, unknown>) {
    return { ...(drawerState.current.draft as Record<string, unknown>), ...fields };
}

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
        // 8.25 is exact in binary; 8.2 * 100 is 819.999…, which floors to 8.19 here and on the server alike.
        state({ contrastRatio: 8.25 });
        renderDrawer();
        expect(screen.getByText('contrastOk {"ratio":"8.25"}')).toBeInTheDocument();
        cleanup();

        state({ contrastRatio: 3.6, errors: { backgroundContrast: true } });
        renderDrawer();
        expect(screen.queryByText(/^contrastLow/)).toBeNull();
        expect(screen.getByRole('alert')).toHaveTextContent('backgroundContrastInvalid');
        cleanup();

        // Before a blocked save the live hint is the only message.
        state({ contrastRatio: 3.6 });
        renderDrawer();
        expect(screen.getByText('contrastLow {"ratio":"3.60","min":"4.5"}')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('formats both contrast hints with the locale decimal separator, floored', () => {
        drawerState.locale = 'el';
        state({ contrastRatio: 8.209 });
        renderDrawer();
        expect(screen.getByText('contrastOk {"ratio":"8,20"}')).toBeInTheDocument();
        cleanup();

        state({ draft: draftWith({ titleColor: '#E9B8C4' }), titleContrastRatio: 2.6189 });
        renderDrawer();
        expect(screen.getByText('titleContrastLow {"ratio":"2,61","min":"3"}')).toBeInTheDocument();
    });
});

describe('ThemePresetDrawer server errors', () => {
    function showFailure(error: unknown) {
        state({ failure: { kind: 'other', error } });
        renderDrawer();
        return screen.getByRole('alert');
    }

    it('shows the localized detail of a low-contrast title (3055)', () => {
        const error = new ApiError(400, {
            errorCode: 3055,
            detail: 'Το χρώμα τίτλου είναι πολύ κοντά: 2,61:1',
            details: { ratio: 2.61, minimum: 3 },
        });
        expect(showFailure(error)).toHaveTextContent('Το χρώμα τίτλου είναι πολύ κοντά: 2,61:1');
    });

    it('shows the localized detail of a font the preset cannot take (5145)', () => {
        const error = new ApiError(409, { errorCode: 5145, detail: 'Αυτή η γραμματοσειρά δεν μπορεί να χρησιμοποιηθεί.' });
        expect(showFailure(error)).toHaveTextContent('Αυτή η γραμματοσειρά δεν μπορεί να χρησιμοποιηθεί.');
    });

    it('shows the localized detail of a background too dark for the text (3001 with a ratio)', () => {
        const error = new ApiError(400, { errorCode: 3001, detail: 'Πολύ σκούρο φόντο: 3,60:1', details: { ratio: 3.6, minimum: 4.5 } });
        expect(showFailure(error)).toHaveTextContent('Πολύ σκούρο φόντο: 3,60:1');
    });

    it('does not show the fixed English detail of a bean-validation 3001', () => {
        const error = new ApiError(400, { errorCode: 3001, detail: 'One or more fields are invalid', errors: { titleColor: 'must match' } });
        const alert = showFailure(error);
        expect(alert).not.toHaveTextContent('One or more fields are invalid');
        expect(alert).toHaveTextContent('validationFailed');
    });

    it('says the server could not be reached on a network error', () => {
        const alert = showFailure(new TypeError('Failed to fetch'));
        expect(alert).not.toHaveTextContent('Failed to fetch');
        expect(alert).toHaveTextContent('network');
    });

    it('says how long to wait on a 429', () => {
        const error = new ApiError(429, { errorCode: 3010, detail: 'Too many requests', retryAfterSeconds: 30 });
        expect(showFailure(error)).toHaveTextContent('rateLimitedWithWait {"seconds":30}');
    });

    it('shows the localized detail of a service-rule 3001 that highlights no field', () => {
        const error = new ApiError(400, { errorCode: 3001, detail: 'Αυτός ο τύπος εκδήλωσης δεν υποστηρίζει θέματα.' });
        const alert = showFailure(error);
        expect(alert).toHaveTextContent('Αυτός ο τύπος εκδήλωσης δεν υποστηρίζει θέματα.');
        expect(alert).not.toHaveTextContent('validationFailed');
    });

    it('falls back to generic copy for a service-rule 3001 without a detail', () => {
        const alert = showFailure(new ApiError(400, { errorCode: 3001, detail: ' ' }));
        expect(alert).toHaveTextContent(/^generic$/);
    });

    it('says the theme is gone on a 404', () => {
        state({ failure: { kind: 'notFound' } });
        renderDrawer();
        expect(screen.getByRole('alert')).toHaveTextContent('notFound');
        expect(screen.getByRole('button', { name: 'save' })).toBeDisabled();
    });

    it('shows a 404 that reaches the server-error path as localized copy, not the backend detail', () => {
        const alert = showFailure(new ApiError(404, { errorCode: 2001, detail: 'Theme preset not found' }));
        expect(alert).not.toHaveTextContent('Theme preset not found');
        expect(alert).toHaveTextContent('resourceNotFound');
    });

    it('shows generic copy and the reference on a 500', () => {
        const alert = showFailure(new ApiError(500, { errorCode: 9001, detail: 'boom', errorRef: '0123456789ab' }));
        expect(alert).not.toHaveTextContent('boom');
        expect(alert).toHaveTextContent('errorRef {"ref":"0123456789ab"}');
    });
});

describe('ThemePresetDrawer while saving', () => {
    it('blocks closing the drawer and disables Cancel', () => {
        state({ isSaving: true });
        renderDrawer();
        expect(screen.getByTestId('drawer').dataset.closeDisabled).toBe('true');
        expect(screen.getByRole('button', { name: 'cancel' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'save' })).toBeDisabled();
    });

    it('lets the drawer close and Cancel work when idle', () => {
        const onCloseAction = vi.fn();
        state();
        render(<ThemePresetDrawer preset={PRESET} sortOrder={0} eventTypes={EVENT_TYPES} onCloseAction={onCloseAction} />);
        expect(screen.getByTestId('drawer').dataset.closeDisabled).toBe('false');
        fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
        expect(onCloseAction).toHaveBeenCalledOnce();
    });
});

describe('ThemePresetDrawer colour inputs', () => {
    it('gives each colour picker and hex input its own accessible name', () => {
        state({ draft: draftWith({ titleColor: '#7A1F3D' }), titleColorInputValue: '#7a1f3d' });
        const { container } = render(<ThemePresetDrawer preset={PRESET} sortOrder={0} eventTypes={EVENT_TYPES} onCloseAction={vi.fn()} />);
        const pickers = container.querySelectorAll('input[type="color"]');
        expect([...pickers].map((picker) => picker.getAttribute('aria-label'))).toEqual(['backgroundColor', 'titleColor']);
        expect(screen.getByRole('textbox', { name: 'backgroundColorHex' })).toHaveValue('#BFE6E2');
        expect(screen.getByRole('textbox', { name: 'titleColorHex' })).toHaveValue('#7A1F3D');
    });
});

describe('ThemePresetDrawer title colour', () => {
    it('says the title uses the ink colour while empty, and offers no reset', () => {
        state();
        renderDrawer();
        expect(screen.getByText('titleColorInkHint')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'titleColorUseInk' })).toBeDisabled();
    });

    it('shows the live contrast and resets to ink', () => {
        const handleUseInk = vi.fn();
        state({ draft: draftWith({ titleColor: '#7A1F3D' }), titleContrastRatio: 9.1, previewTitleColor: '#7A1F3D', handleUseInk });
        renderDrawer();
        expect(screen.getByText('titleContrastOk {"ratio":"9.10"}')).toBeInTheDocument();
        expect(screen.getByDisplayValue('#7A1F3D')).toHaveAccessibleName('titleColorHex');
        expect(screen.getByTestId('preview').dataset.titleColor).toBe('#7A1F3D');
        fireEvent.click(screen.getByRole('button', { name: 'titleColorUseInk' }));
        expect(handleUseInk).toHaveBeenCalledOnce();
    });

    it('blocks a low-contrast title with an inline alert in place of the live hint', () => {
        state({ draft: draftWith({ titleColor: '#C8EEEA' }), titleContrastRatio: 1.1, errors: { titleContrast: true } });
        renderDrawer();
        expect(screen.getByRole('alert')).toHaveTextContent('titleContrastInvalid');
        expect(screen.queryByText(/^titleContrastLow/)).toBeNull();
    });

    it('flags a malformed title colour', () => {
        state({ draft: draftWith({ titleColor: '#12' }), errors: { titleColor: true } });
        renderDrawer();
        expect(screen.getByText('titleColorInvalid')).toBeInTheDocument();
    });
});

describe('ThemePresetDrawer heading font', () => {
    it('lists the app font first, then each font as family (key)', () => {
        const handleFieldChange = vi.fn();
        state({ handleFieldChange });
        renderDrawer();
        const picker = screen.getByRole('combobox', { name: /headingFont/ });
        expect([...(picker as HTMLSelectElement).options].map((option) => option.textContent)).toEqual([
            'headingFontDefault',
            'headingFontOption {"familyName":"Alegreya","key":"alegreya"}',
        ]);
        fireEvent.change(picker, { target: { value: 'f1' } });
        expect(handleFieldChange).toHaveBeenCalled();
    });

    it('keeps an assigned archived font selected and says it is archived', () => {
        state({
            draft: draftWith({ headingFontId: 'f9' }),
            fontOptions: [
                { id: 'f1', key: 'alegreya', familyName: 'Alegreya', status: 'live' },
                { id: 'f9', key: 'old', familyName: 'Old', status: 'archived' },
            ],
            previewFont: { key: 'old', fallback: 'serif', url: '/api/theme-fonts/old/1.woff2' },
        });
        renderDrawer();
        const picker = screen.getByRole('combobox', { name: /headingFont/ }) as HTMLSelectElement;
        expect(picker.value).toBe('f9');
        expect(picker.selectedOptions[0].textContent).toBe('headingFontArchived {"familyName":"Old","key":"old"}');
        expect(screen.getByTestId('preview').dataset.font).toBe('old');
    });

    it('points to the Theme fonts tab when no font is ready', () => {
        state({ fontOptions: [], hasUsableFonts: false });
        renderDrawer();
        expect(screen.getByText('headingFontEmpty')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'headingFontEmptyLink' })).toHaveAttribute('href', '#theme-fonts');
    });

    it('says the fonts are loading or failed, and keeps the picker usable', () => {
        state({ fontsStatus: 'loading', hasUsableFonts: false, fontOptions: [] });
        renderDrawer();
        expect(screen.getByText('headingFontLoading')).toBeInTheDocument();
        expect(screen.queryByText('headingFontEmpty')).toBeNull();
        expect(screen.getByRole('combobox', { name: /headingFont/ })).toBeEnabled();
        cleanup();

        state({ fontsStatus: 'error', hasUsableFonts: false, fontOptions: [] });
        renderDrawer();
        expect(screen.getByText('headingFontLoadFailed')).toBeInTheDocument();
        expect(screen.queryByText('headingFontEmpty')).toBeNull();
    });
});
