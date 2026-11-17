import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditorConflictDialog } from '@/components/saveMyDate/editor/EditorConflictDialog';
import { EditorLeaveDialog } from '@/components/saveMyDate/editor/EditorLeaveDialog';
import en from '@/messages/en.json';

function renderIn(node: ReactNode) {
    return render(
        <NextIntlClientProvider locale="en" messages={en}>
            {node}
        </NextIntlClientProvider>,
    );
}

describe('EditorConflictDialog', () => {
    afterEach(cleanup);

    it('offers only the newer version', () => {
        const onReload = vi.fn();
        renderIn(<EditorConflictDialog open onReload={onReload} />);

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('This invitation has newer changes.');
        expect(dialog).toHaveTextContent('Changes not saved here will be lost.');
        expect(screen.getAllByRole('button')).toHaveLength(1);

        fireEvent.click(screen.getByRole('button', { name: 'Load the newer version' }));
        expect(onReload).toHaveBeenCalledOnce();
    });

    it('stays open on Escape', () => {
        renderIn(<EditorConflictDialog open onReload={vi.fn()} />);
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
});

describe('EditorLeaveDialog', () => {
    afterEach(cleanup);

    it('leaves or stays', () => {
        const onLeave = vi.fn();
        const onStay = vi.fn();
        renderIn(<EditorLeaveDialog open onLeave={onLeave} onStay={onStay} />);

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent("Your changes aren't saved.");
        expect(dialog).toHaveTextContent('If you leave now, they will be lost.');
        // The corner close button is called Stay too.
        fireEvent.click(screen.getByText('Stay'));
        fireEvent.click(screen.getByRole('button', { name: 'Leave' }));

        expect(onStay).toHaveBeenCalledOnce();
        expect(onLeave).toHaveBeenCalledOnce();
    });
});
