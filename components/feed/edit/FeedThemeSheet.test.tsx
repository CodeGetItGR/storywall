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

function renderSheet(background?: string, themes: ThemeRadioOption[] = options) {
    const props = { onSelect: vi.fn(), onBackground: vi.fn() };
    render(
        <FeedThemeSheet
            open
            isDesktop={false}
            options={themes}
            fontFaces=""
            hasInvitationThemes={false}
            disabled={false}
            previewTitle="Wedding"
            background={background}
            onSelect={props.onSelect}
            onBackground={props.onBackground}
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

    it('sets the background colour, and Default clears it', () => {
        const { onBackground } = renderSheet('#F5E6D3');
        fireEvent.change(screen.getByLabelText('sectionSettings.background'), { target: { value: '#aabbcc' } });
        expect(onBackground).toHaveBeenCalledWith('#aabbcc');
        fireEvent.click(screen.getByRole('button', { name: 'lineHeightDefault' }));
        expect(onBackground).toHaveBeenLastCalledWith(undefined);
    });

    it('offers no Default without a colour', () => {
        renderSheet();
        expect(screen.queryByRole('button', { name: 'lineHeightDefault' })).toBeNull();
    });

    it('warns while the colour is too dark for the text', () => {
        renderSheet('#000000');
        expect(screen.getByText('tooDark')).toBeTruthy();
        cleanup();
        renderSheet('#F5E6D3');
        expect(screen.queryByText('tooDark')).toBeNull();
    });

    it('holds just the Background row for an event with no themes to pick', () => {
        renderSheet(undefined, []);
        expect(screen.queryByRole('radiogroup')).toBeNull();
        expect(screen.getByLabelText('sectionSettings.background')).toBeTruthy();
    });
});
