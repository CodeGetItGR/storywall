import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RolePickerList } from '@/components/memberRoles/RolePickerList';
import { OTHER_CHOICE } from '@/lib/memberRoles';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));

const OPTIONS = [
    { roleKey: 'BRIDE', label: { en: 'Bride', el: 'Νύφη' }, emoji: '💍', maxHolders: 1, holders: 0, available: true },
    { roleKey: 'BEST_MAN', label: { en: 'Best man', el: 'Κουμπάρος' }, emoji: '🥂', maxHolders: 2, holders: 2, available: false },
];

afterEach(cleanup);

function renderList(overrides: Partial<Parameters<typeof RolePickerList>[0]> = {}) {
    const props = {
        options: OPTIONS,
        allowCustom: true,
        customLocked: false,
        currentRoleKey: null,
        draft: { choice: null, customText: '' },
        customMaxLength: 40,
        onChoiceChangeAction: vi.fn(),
        onCustomTextChangeAction: vi.fn(),
        ...overrides,
    };
    render(<RolePickerList {...props} />);
    return props;
}

describe('RolePickerList', () => {
    it('disables a full role and marks it', () => {
        renderList();
        expect(screen.getByRole('radio', { name: /Best man/ })).toBeDisabled();
        expect(screen.getByText('full')).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /Bride/ })).toBeEnabled();
    });

    it('keeps a full role pickable for its holder', () => {
        renderList({ currentRoleKey: 'BEST_MAN' });
        expect(screen.getByRole('radio', { name: /Best man/ })).toBeEnabled();
    });

    it('reports the picked role', () => {
        const props = renderList();
        fireEvent.click(screen.getByRole('radio', { name: /Bride/ }));
        expect(props.onChoiceChangeAction).toHaveBeenCalledWith('BRIDE');
    });

    it('hides Other when custom roles are off', () => {
        renderList({ allowCustom: false });
        expect(screen.queryByRole('radio', { name: 'other' })).not.toBeInTheDocument();
    });

    it('shows the text field when Other is picked', () => {
        const props = renderList({ draft: { choice: OTHER_CHOICE, customText: 'Uncle' } });
        const input = screen.getByRole('textbox', { name: 'other' });
        expect(input).toHaveValue('Uncle');
        expect(input).toHaveAttribute('maxLength', '40');
        fireEvent.change(input, { target: { value: 'Aunt' } });
        expect(props.onCustomTextChangeAction).toHaveBeenCalledWith('Aunt');
    });

    it('locks Other with a note', () => {
        renderList({ customLocked: true });
        expect(screen.getByRole('radio', { name: 'other' })).toBeDisabled();
        expect(screen.getByText('lockedNote')).toBeInTheDocument();
    });
});
