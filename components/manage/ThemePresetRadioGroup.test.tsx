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

    it('puts the label on the card with no background strip, centred', () => {
        renderGroup([preset('a', { titleColor: '#7A2E3B' })]);
        const label = labelOf('Preset a');
        expect(label.closest('.bg-event')).toBeNull();
        expect(label).toHaveClass('text-center');
        expect(label.parentElement).toHaveClass('items-center', 'justify-center');
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
        expect((label.parentElement as HTMLElement).style.getPropertyValue('--event-title')).toBe('');
        expect(container.querySelector('style')).toBeNull();
    });

    it('is still a radio named by its label on a themed card', () => {
        renderGroup([preset('a', { headingFont: SCRIPT, titleColor: '#7A2E3B' })]);
        expect(screen.getByRole('radio', { name: 'Preset a' })).toBeInTheDocument();
    });

    it('gives the label room for script fonts and accents', () => {
        renderGroup([preset('a', { titleColor: '#7A2E3B' })]);
        expect(labelOf('Preset a')).toHaveClass('leading-normal', 'py-1');
    });

    it('keeps a pale title colour', () => {
        renderGroup([preset('a', { titleColor: '#BFE6FF' })]);
        expect(labelOf('Preset a')).toHaveClass('text-event-title');
    });

    it("previews the event title in the theme's font, with the theme name below in the normal font", () => {
        render(
            <ThemePresetRadioGroup
                options={[preset('a', { headingFont: SCRIPT, titleColor: '#7A2E3B' })]}
                labelledBy="heading"
                disabled={false}
                previewTitle="Anna's baptism"
                onSelectAction={vi.fn()}
            />,
        );
        const title = screen.getByText("Anna's baptism");
        expect(title).toHaveClass('event-heading', 'text-event-title');
        expect(title.closest('[data-theme-font]')).not.toBeNull();
        const name = screen.getByText('Preset a');
        expect(name).not.toHaveClass('event-heading');
        expect(name.closest('[data-theme-font]')).toBeNull();
        expect(screen.getByRole('radio', { name: 'Preset a' })).toBeInTheDocument();
    });

    it.each([null, 'pink'])('treats a valid title and font on an unusable background (%s) as no theme', (backgroundColor) => {
        renderGroup([preset('a', { backgroundColor, titleColor: '#7A2E3B', headingFont: SCRIPT })]);
        const label = labelOf('Preset a');
        expect(label.closest('.bg-event')).toBeNull();
        expect(label.closest('[data-theme-font]')).toBeNull();
        expect(label).toHaveClass('text-ink');
        expect((label.parentElement as HTMLElement).style.getPropertyValue('--event-title')).toBe('');
    });

    it('ignores a title colour that is not #RRGGBB', () => {
        renderGroup([preset('a', { titleColor: 'red' })]);
        const label = labelOf('Preset a');
        expect(label).toHaveClass('text-ink');
        expect(label.closest('.bg-event')).toBeNull();
        expect((label.parentElement as HTMLElement).style.getPropertyValue('--event-title')).toBe('');
    });

    it("doesn't let a malformed font drop a valid sibling with the same key", () => {
        const malformed: EventThemeFontDto = { ...SCRIPT, url: 'https://evil.example/great-vibes.woff2' };
        const { container } = renderGroup([preset('a', { headingFont: malformed }), preset('b', { headingFont: SCRIPT })]);
        const styles = container.querySelectorAll('style');
        expect(styles).toHaveLength(1);
        expect(styles[0].textContent).toContain('/api/theme-fonts/great-vibes/1.woff2');
    });
});
