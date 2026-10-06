import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemePresetRadioGroup, type ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';
import type { EventThemeFontDto } from '@/lib/api/types';

vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: () => null }));

const SCRIPT: EventThemeFontDto = { key: 'great-vibes', fallback: 'serif', url: '/api/theme-fonts/great-vibes/1.woff2' };
const ROUNDED: EventThemeFontDto = { key: 'baloo', fallback: 'sans-serif', url: '/api/theme-fonts/baloo/3.woff2' };

const NONE: ThemeRadioOption = {
    id: 'none',
    presetId: null,
    label: 'No theme',
    backgroundColor: null,
    illustrationUrl: null,
    titleColor: null,
    headingFont: null,
    selected: true,
};

function preset(id: string, overrides: Partial<ThemeRadioOption> = {}): ThemeRadioOption {
    return {
        id,
        presetId: id,
        label: `Preset ${id}`,
        backgroundColor: '#BFE6E2',
        illustrationUrl: `https://media.example/${id}.webp`,
        titleColor: null,
        headingFont: null,
        selected: false,
        ...overrides,
    };
}

function renderGroup(options: ThemeRadioOption[]) {
    return render(<ThemePresetRadioGroup options={options} labelledBy="heading" disabled={false} onSelectAction={vi.fn()} />);
}

function labelOf(text: string): HTMLElement {
    return screen.getByText(text);
}

afterEach(cleanup);

describe('ThemePresetRadioGroup fonts and title colour', () => {
    it('declares a font shared by two cards only once', () => {
        const { container } = renderGroup([NONE, preset('a', { headingFont: SCRIPT }), preset('b', { headingFont: SCRIPT })]);
        const styles = container.querySelectorAll('style');
        expect(styles).toHaveLength(1);
        expect(styles[0].textContent).toContain('theme-great-vibes');
    });

    it('declares each distinct font', () => {
        const { container } = renderGroup([preset('a', { headingFont: SCRIPT }), preset('b', { headingFont: ROUNDED })]);
        const css = Array.from(container.querySelectorAll('style')).map((style) => style.textContent);
        expect(css).toHaveLength(2);
        expect(css.join('')).toContain('theme-great-vibes');
        expect(css.join('')).toContain('theme-baloo');
    });

    it("sets the card label's font and title colour on its scope", () => {
        renderGroup([preset('a', { headingFont: SCRIPT, titleColor: '#7A2E3B' })]);
        const label = labelOf('Preset a');
        const scope = label.closest('[data-theme-font]') as HTMLElement;
        expect(scope).not.toBeNull();
        expect(scope.style.getPropertyValue('--event-title')).toBe('#7A2E3B');
        expect(scope.style.getPropertyValue('--event-heading-font')).toBe('"theme-great-vibes", serif');
        expect(label).toHaveClass('event-heading', 'text-event-title');
    });

    it('puts a title colour only on the preset background it was checked against', () => {
        renderGroup([preset('a', { titleColor: '#7A2E3B' })]);
        const label = labelOf('Preset a');
        const background = label.closest('.bg-event') as HTMLElement;
        expect(background).not.toBeNull();
        expect(background.style.getPropertyValue('--event-bg')).toBe('#BFE6E2');
    });

    it('keeps a card without a title colour or font on the default look', () => {
        const { container } = renderGroup([preset('a')]);
        const label = labelOf('Preset a');
        expect(label).toHaveClass('text-ink');
        expect(label).not.toHaveClass('text-event-title');
        expect(label.closest('.bg-event')).toBeNull();
        expect(label.closest('[data-theme-font]')).toBeNull();
        expect(container.querySelector('style')).toBeNull();
    });

    it('gives "No theme" no scope, font or colour', () => {
        const { container } = renderGroup([NONE]);
        const label = labelOf('No theme');
        expect(label.closest('[data-theme-font]')).toBeNull();
        expect(label.closest('.bg-event')).toBeNull();
        expect(label).toHaveClass('text-ink');
        expect(container.querySelector('[style*="--event-title"]')).toBeNull();
        expect(container.querySelector('style')).toBeNull();
    });
});
