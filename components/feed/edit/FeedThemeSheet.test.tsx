import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedThemeSheet } from '@/components/feed/edit/FeedThemeSheet';
import type { ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

afterEach(cleanup);

const options: ThemeRadioOption[] = [
    {
        id: 'none',
        presetId: null,
        label: 'No theme',
        backgroundColor: null,
        illustrationUrl: null,
        titleColor: null,
        headingFont: null,
        selected: true,
    },
    {
        id: 'invitation:rose',
        presetId: 'invitation:rose',
        label: 'Rose',
        backgroundColor: '#EEDDCC',
        illustrationUrl: null,
        titleColor: null,
        headingFont: null,
        selected: false,
    },
];

function renderSheet(solidColor?: string, themes: ThemeRadioOption[] = options, disabled = false) {
    const props = { onSelect: vi.fn(), onSolidColor: vi.fn() };
    render(
        <FeedThemeSheet
            open
            isDesktop={false}
            options={themes}
            fontFaces=""
            hasInvitationThemes={false}
            disabled={disabled}
            solidDisabled={disabled}
            previewTitle="Wedding"
            solidColor={solidColor}
            onSelect={props.onSelect}
            onSolidColor={props.onSolidColor}
            onClose={vi.fn()}
        />,
    );
    return props;
}

describe('FeedThemeSheet', () => {
    it('lists the themes under the Theme title and sends a pick', () => {
        const { onSelect } = renderSheet();
        expect(screen.getByRole('dialog', { name: 'theme' })).toBeTruthy();
        fireEvent.click(screen.getByRole('radio', { name: /Rose/ }));
        expect(onSelect).toHaveBeenCalledWith('invitation:rose');
    });

    // The sheet is dark: on white cards each theme's title keeps its own colour and stays readable.
    it('draws the theme cards on white', () => {
        renderSheet();
        for (const card of screen.getAllByRole('radio')) expect(card).toHaveClass('bg-white');
    });

    it('offers the solid colours above the designs, each group named by its heading', () => {
        const { onSolidColor } = renderSheet('#B5BFA6');
        const circles = screen.getByRole('group', { name: 'solidColor' });
        const cards = screen.getByRole('radiogroup', { name: 'design' });
        expect(circles.compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByRole('button', { name: '#B5BFA6' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: '#AC9FC7' }));
        expect(onSolidColor).toHaveBeenCalledExactlyOnceWith('#AC9FC7');
    });

    it('offers white first, picked with "No theme"', () => {
        const { onSolidColor } = renderSheet('#FFFFFF');
        const circles = screen.getByRole('group', { name: 'solidColor' });
        const white = screen.getByRole('button', { name: '#FFFFFF' });
        expect(circles.firstElementChild).toBe(white);
        expect(white).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('radio', { name: /No theme/ })).toBeChecked();
        fireEvent.click(white);
        expect(onSolidColor).toHaveBeenCalledExactlyOnceWith('#FFFFFF');
    });

    it('holds the cards and the colours while Save runs or a theme loads', () => {
        const { onSelect } = renderSheet('#F5E6D3', options, true);
        const rose = screen.getByRole('radio', { name: /Rose/ });
        expect(rose.getAttribute('aria-disabled')).toBe('true');
        fireEvent.click(rose);
        expect(onSelect).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: '#F5E6D3' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'moreColors' })).toBeDisabled();
    });
});
