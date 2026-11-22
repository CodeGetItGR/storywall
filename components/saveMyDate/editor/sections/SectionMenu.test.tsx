import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SectionMenu } from '@/components/saveMyDate/editor/sections/SectionMenu';
import en from '@/messages/en.json';

afterEach(cleanup);

function renderMenu(onDelete?: () => void) {
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <SectionMenu canMoveUp canMoveDown onMoveUp={vi.fn()} onMoveDown={vi.fn()} onDelete={onDelete} />
        </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.sections.options }));
}

describe('SectionMenu', () => {
    it('offers Delete when it is given', async () => {
        renderMenu(vi.fn());
        expect(await screen.findByRole('menuitem', { name: en.InvitationEditor.sections.delete })).toBeTruthy();
    });

    it('leaves Delete out for a block that only hides', async () => {
        renderMenu();
        await screen.findByRole('menuitem', { name: en.InvitationEditor.sections.moveUp });
        expect(screen.queryByRole('menuitem', { name: en.InvitationEditor.sections.delete })).toBeNull();
    });
});
