import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeFontDrawer } from '@/components/admin/themeFonts/ThemeFontDrawer';
import { ApiError } from '@/lib/api/client';
import type { AdminThemeFontDto } from '@/lib/api/types';

const drawerState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

// Keys come back as-is; the ApiErrors namespace is prefixed so the copy's source is visible.
vi.mock('next-intl', () => ({
    useTranslations: (namespace?: string) => (key: string) => (namespace === 'ApiErrors' ? `ApiErrors.${key}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ title, children, footer }: { title: ReactNode; children: ReactNode; footer: ReactNode }) => (
        <div>
            <h2>{title}</h2>
            {children}
            {footer}
        </div>
    ),
}));
vi.mock('@/hooks/useThemeFontDrawer', () => ({ useThemeFontDrawer: () => drawerState.current }));

const FONT: AdminThemeFontDto = {
    id: 'f1',
    key: 'gfs-didot',
    familyName: 'GFS Didot',
    fallback: 'serif',
    archived: false,
    url: '/api/theme-fonts/gfs-didot/1.woff2',
    presetCount: 2,
};

function state(overrides: Record<string, unknown> = {}) {
    drawerState.current = {
        isCreate: false,
        draft: { key: 'gfs-didot', familyName: 'GFS Didot', fallback: 'serif', archived: false },
        errors: {},
        failure: null,
        fileError: null,
        hasPendingFile: false,
        createdWithoutFile: false,
        availability: 'AVAILABLE',
        previewFamily: 'theme-preview-1',
        previewFailed: false,
        presetCount: 2,
        isSaving: false,
        handleFieldChange: vi.fn(),
        handleFallbackChange: vi.fn(),
        handleAvailabilityChange: vi.fn(),
        handleFileChange: vi.fn(),
        handleSubmit: vi.fn((event: Event) => event.preventDefault()),
        ...overrides,
    };
}

function renderDrawer(font: AdminThemeFontDto | null = FONT) {
    render(<ThemeFontDrawer font={font} onCloseAction={vi.fn()} />);
}

afterEach(cleanup);

describe('ThemeFontDrawer', () => {
    it('shows the key read-only and the availability control when editing', () => {
        state();
        renderDrawer();
        expect(screen.getByRole('heading', { name: 'GFS Didot' })).toBeInTheDocument();
        expect(screen.getByText('gfs-didot')).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: /key/ })).toBeNull();
        expect(screen.getByRole('button', { name: 'archived' })).toBeInTheDocument();
    });

    it('asks for a key and hides availability when creating', () => {
        state({ isCreate: true, previewFamily: null, presetCount: 0 });
        renderDrawer(null);
        expect(screen.getByRole('heading', { name: 'createTitle' })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /key/ })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'archived' })).toBeNull();
    });

    it('offers the two fallbacks and reports a change', () => {
        const handleFallbackChange = vi.fn();
        state({ handleFallbackChange });
        renderDrawer();
        expect(screen.getByRole('radio', { name: 'fallbackSerif' })).toBeChecked();
        fireEvent.click(screen.getByRole('radio', { name: 'fallbackSansSerif' }));
        expect(handleFallbackChange).toHaveBeenCalled();
    });

    it('renders the samples in the loaded font with the draft fallback behind it', () => {
        state({ draft: { key: 'gfs-didot', familyName: 'GFS Didot', fallback: 'sans-serif', archived: false } });
        renderDrawer();
        expect(screen.getByTestId('font-sample')).toHaveStyle({ fontFamily: '"theme-preview-1", sans-serif' });
        expect(screen.getByText('usedBy')).toBeInTheDocument();
    });

    it('shows a taken key on the key field', () => {
        state({ isCreate: true, failure: { kind: 'keyTaken' } });
        renderDrawer(null);
        expect(screen.getByText('keyTaken')).toBeInTheDocument();
    });

    it('shows a display name the server refused on the name field', () => {
        state({ failure: { kind: 'familyNameInvalid' } });
        renderDrawer();
        expect(screen.getByText('familyNameInvalid')).toBeInTheDocument();
    });

    it('shows the type hint for a .ttf pick', () => {
        state({ fileError: 'type' });
        renderDrawer();
        expect(screen.getByText('fileType')).toBeInTheDocument();
    });

    it('shows the size hint for an oversize file', () => {
        state({ fileError: 'size' });
        renderDrawer();
        expect(screen.getByText('fileSize')).toBeInTheDocument();
    });

    it('says when a picked file cannot be previewed', () => {
        state({ previewFamily: null, previewFailed: true, hasPendingFile: true });
        renderDrawer();
        expect(screen.getByRole('alert')).toHaveTextContent('previewFailed');
        expect(screen.getByTestId('font-sample')).toHaveStyle({ fontFamily: 'serif' });
    });

    it('renders the localized detail of a 3054 and lists every missing character', () => {
        const detail = 'Η γραμματοσειρά δεν έχει αυτούς τους χαρακτήρες: ΐ, ΰ.';
        const error = new ApiError(400, { errorCode: 3054, detail, details: { missing: ['ΐ', 'ΰ'] } });
        state({ failure: { kind: 'other', error } });
        renderDrawer();
        expect(screen.getByRole('alert')).toHaveTextContent(detail);
        expect(screen.getByRole('list', { name: 'missingCharacters' })).toHaveTextContent('ΐΰ');
    });

    it('uses the shared copy for a rate-limited upload', () => {
        state({ failure: { kind: 'other', error: new ApiError(429, { errorCode: 3010, detail: 'Too many requests', retryAfterSeconds: 600 }) } });
        renderDrawer();
        expect(screen.getByRole('alert')).toHaveTextContent('ApiErrors.rateLimitedWithWaitMinutes');
    });

    it('says the server could not be reached on a network failure', () => {
        state({ failure: { kind: 'other', error: new TypeError('Failed to fetch') } });
        renderDrawer();
        expect(screen.getByRole('alert')).toHaveTextContent('network');
    });

    it('says the font was saved without its file when the upload after a create fails', () => {
        state({ failure: { kind: 'other', error: new ApiError(502, { errorCode: 5004 }) }, createdWithoutFile: true });
        renderDrawer(null);
        expect(screen.getByRole('alert')).toHaveTextContent('createdWithoutFile');
        expect(screen.getByRole('alert')).toHaveTextContent('ApiErrors.storageUploadFailed');
    });

    it('reports a font that no longer exists and blocks saving', () => {
        state({ failure: { kind: 'notFound' } });
        renderDrawer();
        expect(screen.getByRole('alert')).toHaveTextContent('notFound');
        expect(screen.getByRole('button', { name: 'save' })).toBeDisabled();
    });
});
