import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

    it('is a radio group named by its heading', () => {
        state();
        renderPicker();
        expect(screen.getByRole('radiogroup', { name: 'label' })).toBeInTheDocument();
    });

    it('offers "No theme" and every preset, with the current one checked', () => {
        state();
        renderPicker();
        expect(screen.getByRole('radio', { name: 'none' })).toHaveAttribute('aria-checked', 'false');
        expect(screen.getByRole('radio', { name: 'Dino' })).toHaveAttribute('aria-checked', 'true');
    });

    it('saves the picked preset', () => {
        const select = vi.fn();
        state({ select });
        renderPicker();
        fireEvent.click(screen.getByRole('radio', { name: 'Dino' }));
        expect(select).toHaveBeenCalledWith('p1');
    });

    it('clears the theme from "No theme"', () => {
        const select = vi.fn();
        state({ select });
        renderPicker();
        fireEvent.click(screen.getByRole('radio', { name: 'none' }));
        expect(select).toHaveBeenCalledWith(null);
    });

    it('marks every option aria-disabled, never disabled (focus must stay), and ignores clicks while read-only or saving', () => {
        const select = vi.fn();
        state({ disabled: true, select });
        renderPicker();
        for (const radio of screen.getAllByRole('radio')) {
            expect(radio).toHaveAttribute('aria-disabled', 'true');
            expect(radio).not.toBeDisabled();
            fireEvent.click(radio);
        }
        expect(select).not.toHaveBeenCalled();
    });

    it('keeps only the checked option in the tab order', () => {
        state();
        renderPicker();
        expect(screen.getByRole('radio', { name: 'Dino' })).toHaveAttribute('tabindex', '0');
        expect(screen.getByRole('radio', { name: 'none' })).toHaveAttribute('tabindex', '-1');
    });

    it('falls back to the first option for the tab order when none is checked', () => {
        state({ selectedKey: 'gone' });
        renderPicker();
        expect(screen.getByRole('radio', { name: 'none' })).toHaveAttribute('tabindex', '0');
    });

    it('moves focus with the arrow keys, Home and End, wrapping around', () => {
        state({ presets: [PRESET, { ...PRESET, id: 'p2', key: 'fox', name: { en: 'Fox', el: 'Αλεπού' } }], selectedKey: null });
        renderPicker();
        const none = screen.getByRole('radio', { name: 'none' });
        const dino = screen.getByRole('radio', { name: 'Dino' });
        const fox = screen.getByRole('radio', { name: 'Fox' });
        none.focus();

        fireEvent.keyDown(none, { key: 'ArrowRight' });
        expect(dino).toHaveFocus();
        expect(dino).toHaveAttribute('tabindex', '0');
        expect(none).toHaveAttribute('tabindex', '-1');
        fireEvent.keyDown(dino, { key: 'ArrowDown' });
        expect(fox).toHaveFocus();
        fireEvent.keyDown(fox, { key: 'ArrowRight' });
        expect(none).toHaveFocus();
        fireEvent.keyDown(none, { key: 'ArrowLeft' });
        expect(fox).toHaveFocus();
        fireEvent.keyDown(fox, { key: 'ArrowUp' });
        expect(dino).toHaveFocus();
        fireEvent.keyDown(dino, { key: 'End' });
        expect(fox).toHaveFocus();
        fireEvent.keyDown(fox, { key: 'Home' });
        expect(none).toHaveFocus();
    });

    it('keeps focus on an option while a save is running', () => {
        state({ isSaving: true, disabled: true, savingPresetId: 'p1' });
        renderPicker();
        const dino = screen.getByRole('radio', { name: 'Dino' });
        dino.focus();
        expect(dino).toHaveFocus();
    });

    it('shows the applied theme as a leading, checked, non-interactive option when it is no longer offered', () => {
        const select = vi.fn();
        state({
            select,
            selectedKey: 'retired',
            staleTheme: {
                presetKey: 'retired',
                backgroundColor: '#FFD6E0',
                illustrationUrl: 'https://media.example/retired.webp',
                titleColor: '#7A2E3B',
                headingFont: { key: 'great-vibes', fallback: 'serif', url: '/api/theme-fonts/great-vibes/1.woff2' },
            },
        });
        const { container } = render(<ThemePicker event={{ id: 'e1' } as EventDetailResponseDto} canWrite />);
        const radios = screen.getAllByRole('radio');
        expect(radios[0]).toHaveAccessibleName('none');
        const current = screen.getByRole('radio', { name: 'current' });
        expect(radios[1]).toBe(current);
        expect(current).toHaveAttribute('aria-checked', 'true');
        expect(current).toHaveAttribute('aria-disabled', 'true');
        fireEvent.click(current);
        expect(select).not.toHaveBeenCalled();
        expect(screen.getAllByTestId('art')[0]).toHaveAttribute('src', 'https://media.example/retired.webp');
        // Its title colour and font come through to the card.
        const scope = within(current).getByText('current').parentElement as HTMLElement;
        expect(scope).toHaveAttribute('data-theme-font');
        expect(scope.style.getPropertyValue('--event-title')).toBe('#7A2E3B');
        expect(container.querySelector('style')?.textContent).toContain('theme-great-vibes');
    });

    it('announces saving and saved in a polite status region', () => {
        state({ isSaving: true });
        const { rerender } = render(<ThemePicker event={{ id: 'e1' } as EventDetailResponseDto} canWrite />);
        expect(screen.getByRole('status')).toHaveTextContent('saving');
        state({ isSaved: true });
        rerender(<ThemePicker event={{ id: 'e1' } as EventDetailResponseDto} canWrite />);
        expect(screen.getByRole('status')).toHaveTextContent('saved');
    });

    it('announces a failed save as an alert', () => {
        state({ saveError: new Error('x') });
        renderPicker();
        expect(screen.getByRole('alert')).toHaveTextContent('Could not save.');
    });

    it('falls back to the colour swatch when a preset image fails to load', () => {
        state();
        renderPicker();
        fireEvent.error(screen.getByTestId('art'));
        expect(screen.queryByTestId('art')).toBeNull();
        expect(screen.getByRole('radio', { name: 'Dino' })).toBeInTheDocument();
    });

    it('tries a preset image again when its url changes', () => {
        state();
        const { rerender } = render(<ThemePicker event={{ id: 'e1' } as EventDetailResponseDto} canWrite />);
        fireEvent.error(screen.getByTestId('art'));
        expect(screen.queryByTestId('art')).toBeNull();
        state({ presets: [{ ...PRESET, illustrationUrl: 'https://media.example/dino-v2.webp' }] });
        rerender(<ThemePicker event={{ id: 'e1' } as EventDetailResponseDto} canWrite />);
        expect(screen.getByTestId('art')).toHaveAttribute('src', 'https://media.example/dino-v2.webp');
    });
});
