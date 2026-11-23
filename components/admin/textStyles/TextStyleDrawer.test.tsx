import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextStyleDrawer, type TextStyleDrawerProps } from '@/components/admin/textStyles/TextStyleDrawer';
import type { TextStylePresetDto } from '@/lib/api/types';
import en from '@/messages/en.json';

vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));
vi.mock('@/hooks/useAdminInvitationThemes', () => ({ useInvitationFonts: () => ({ data: [] }) }));

afterEach(cleanup);

const copy = en.AdminPage.textStyles;

const PRESET: TextStylePresetDto = {
    id: 'p1',
    nameEn: 'Title',
    nameEl: 'Τίτλος',
    font: 'Georgia,serif',
    size: 40,
    weight: 'BOLD',
    italic: false,
    letterSpacing: 2,
    uppercase: true,
    sortOrder: 0,
};

function renderDrawer(props: Partial<TextStyleDrawerProps> = {}) {
    const on = { onSaveAction: vi.fn(), onDeleteAction: vi.fn(), onCloseAction: vi.fn() };
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <TextStyleDrawer preset={null} isSaving={false} isDeleting={false} error={null} {...on} {...props} />
        </NextIntlClientProvider>,
    );
    return on;
}

function save() {
    return screen.getByRole('button', { name: en.AdminPage.save });
}

describe('TextStyleDrawer', () => {
    it('keeps Save off while a name is empty', () => {
        renderDrawer();
        expect(save()).toBeDisabled();
        fireEvent.change(screen.getByLabelText(copy.fields.nameEn, { exact: false }), { target: { value: 'Title' } });
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Georgia,serif' } });
        expect(save()).toBeDisabled();
    });

    it('saves every field', () => {
        const on = renderDrawer();
        fireEvent.change(screen.getByLabelText(copy.fields.nameEn, { exact: false }), { target: { value: 'Title' } });
        fireEvent.change(screen.getByLabelText(copy.fields.nameEl, { exact: false }), { target: { value: 'Τίτλος' } });
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Georgia,serif' } });
        fireEvent.change(screen.getByLabelText(copy.fields.size, { exact: false }), { target: { value: '40' } });
        fireEvent.change(screen.getByLabelText(copy.fields.letterSpacing, { exact: false }), { target: { value: '1.5' } });
        fireEvent.click(screen.getByRole('button', { name: copy.weight.bold }));
        fireEvent.click(screen.getByRole('button', { name: copy.case.upper }));
        fireEvent.click(screen.getByRole('switch', { name: copy.fields.italic }));
        fireEvent.click(save());
        expect(on.onSaveAction).toHaveBeenCalledWith({
            nameEn: 'Title',
            nameEl: 'Τίτλος',
            font: 'Georgia,serif',
            size: 40,
            weight: 'BOLD',
            italic: true,
            letterSpacing: 1.5,
            uppercase: true,
        });
    });

    it('draws the preview in the preset', () => {
        renderDrawer({ preset: PRESET });
        const sample = screen.getByTestId('text-style-sample');
        expect(sample).toHaveTextContent('Title');
        expect(sample.style.fontSize).toBe('40px');
        expect(sample.style.textTransform).toBe('uppercase');
    });

    it('asks before deleting', async () => {
        const on = renderDrawer({ preset: PRESET });
        fireEvent.click(screen.getByRole('button', { name: copy.delete }));
        expect(on.onDeleteAction).not.toHaveBeenCalled();
        expect(await screen.findByText(copy.deleteTitle)).toBeInTheDocument();
        const buttons = screen.getAllByRole('button', { name: copy.delete });
        fireEvent.click(buttons[buttons.length - 1]);
        expect(on.onDeleteAction).toHaveBeenCalled();
    });

    it('has no Delete for a new preset', () => {
        renderDrawer();
        expect(screen.queryByRole('button', { name: copy.delete })).toBeNull();
    });
});
