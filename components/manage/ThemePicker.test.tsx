import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemePicker } from '@/components/manage/ThemePicker';
import type { EventDetailResponseDto } from '@/lib/api/types';

const picker = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/hooks/useThemePicker', () => ({ useThemePicker: () => picker.current }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'Could not save.' }));
vi.mock('@/components/common/ProtectedImage', () => ({
    ProtectedImage: ({ src, onError }: { src: string; onError?: () => void }) => <img data-testid="art" src={src} alt="" onError={onError} />,
}));

const PRESET = {
    id: 'p1',
    key: 'dino-mint',
    name: { en: 'Dino', el: 'Δεινόσαυρος' },
    backgroundColor: '#BFE6E2',
    illustrationUrl: 'https://media.example/dino.webp',
};

function state(overrides: Record<string, unknown> = {}) {
    picker.current = {
        available: true,
        presets: [PRESET],
        isLoading: false,
        loadError: null,
        selectedKey: 'dino-mint',
        isSaving: false,
        savingPresetId: null,
        saveError: null,
        disabled: false,
        select: vi.fn(),
        ...overrides,
    };
}

function renderPicker() {
    render(<ThemePicker event={{ id: 'e1' } as EventDetailResponseDto} canWrite />);
}

afterEach(cleanup);

describe('ThemePicker', () => {
    it("renders nothing when the plan doesn't include themes", () => {
        state({ available: false });
        renderPicker();
        expect(screen.queryByText('label')).toBeNull();
    });

    it('offers "No theme" and every preset, with the current one pressed', () => {
        state();
        renderPicker();
        expect(screen.getByRole('button', { name: 'none' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByRole('button', { name: 'Dino' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('saves the picked preset', () => {
        const select = vi.fn();
        state({ select });
        renderPicker();
        fireEvent.click(screen.getByRole('button', { name: 'Dino' }));
        expect(select).toHaveBeenCalledWith('p1');
    });

    it('clears the theme from "No theme"', () => {
        const select = vi.fn();
        state({ select });
        renderPicker();
        fireEvent.click(screen.getByRole('button', { name: 'none' }));
        expect(select).toHaveBeenCalledWith(null);
    });

    it('disables every option while read-only or saving', () => {
        state({ disabled: true });
        renderPicker();
        for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    });

    it('shows a failed save', () => {
        state({ saveError: new Error('x') });
        renderPicker();
        expect(screen.getByText('Could not save.')).toBeInTheDocument();
    });

    it('falls back to the colour swatch when a preset image fails to load', () => {
        state();
        renderPicker();
        fireEvent.error(screen.getByTestId('art'));
        expect(screen.queryByTestId('art')).toBeNull();
        expect(screen.getByRole('button', { name: 'Dino' })).toBeInTheDocument();
    });
});
