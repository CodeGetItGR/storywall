import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventThemeStep } from '@/components/event/create/EventThemeStep';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'Could not load themes.' }));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src }: { src: string }) => <img data-testid="art" src={src} alt="" />,
}));

const SWAN = { id: 'p1', key: 'swan', name: { en: 'Swan', el: 'Κύκνος' }, backgroundColor: '#FFCCEF', illustrationUrl: 'https://r2.test/swan.png' };

function state(overrides: Record<string, unknown> = {}) {
    form.current = {
        title: '',
        themePresets: [SWAN],
        isThemePresetsLoading: false,
        themePresetsError: null,
        selectedThemePresetId: null,
        onSelectThemePreset: vi.fn(),
        error: null,
        ...overrides,
    };
}

afterEach(cleanup);

describe('EventThemeStep', () => {
    it('offers "No theme" and the presets, with "No theme" picked by default', () => {
        state();
        render(<EventThemeStep />);

        const radios = screen.getAllByRole('radio');
        expect(radios.map((radio) => radio.textContent)).toEqual(['none', 'Swan']);
        expect(radios[0]).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByTestId('art')).toHaveAttribute('src', SWAN.illustrationUrl);
    });

    it('previews the title from the details step on every card, with the theme name below', () => {
        state({ title: '  Anna  ' });
        render(<EventThemeStep />);

        expect(screen.getAllByText('Anna')).toHaveLength(2);
        expect(screen.getByRole('radio', { name: 'Swan' })).toBeInTheDocument();
    });

    it('picks a preset without saving anything itself', () => {
        state();
        render(<EventThemeStep />);

        fireEvent.click(screen.getByRole('radio', { name: /Swan/ }));

        expect(form.current.onSelectThemePreset).toHaveBeenCalledWith('p1');
    });

    it('marks the current pick', () => {
        state({ selectedThemePresetId: 'p1' });
        render(<EventThemeStep />);

        expect(screen.getByRole('radio', { name: /Swan/ })).toHaveAttribute('aria-checked', 'true');
    });

    it('shows a load failure instead of the options', () => {
        state({ themePresets: [], themePresetsError: new Error('boom') });
        render(<EventThemeStep />);

        expect(screen.queryAllByRole('radio')).toHaveLength(0);
        expect(screen.getByText('Could not load themes.')).toBeInTheDocument();
    });

    it('shows a create refusal sent back to this step', () => {
        state({ error: 'This theme is no longer available.' });
        render(<EventThemeStep />);

        expect(screen.getByRole('alert')).toHaveTextContent('This theme is no longer available.');
    });
});
