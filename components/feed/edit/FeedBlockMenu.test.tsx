import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { type ComponentProps, useCallback, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedBlockMenu } from '@/components/feed/edit/FeedBlockMenu';
import en from '@/messages/en.json';

afterEach(cleanup);

type Props = ComponentProps<typeof FeedBlockMenu>;

function Menu({ onOpenChange, ...props }: Props) {
    const [open, setOpen] = useState(props.open);
    const change = useCallback(
        (next: boolean) => {
            setOpen(next);
            onOpenChange(next);
        },
        [onOpenChange],
    );
    return <FeedBlockMenu {...props} open={open} onOpenChange={change} />;
}

function renderMenu(props: Partial<Props> = {}) {
    const handlers = { onOpenChange: vi.fn(), onSettings: vi.fn(), onDelete: vi.fn() };
    const view = render(
        <NextIntlClientProvider locale="en" messages={en}>
            <Menu tools={['settings', 'delete']} uploading={false} open={false} {...handlers} {...props} />
        </NextIntlClientProvider>,
    );
    return { ...handlers, ...view };
}

const { open: settings } = en.InvitationEditor.sectionSettings;
const { delete: remove, options } = en.InvitationEditor.sections;

describe('FeedBlockMenu', () => {
    it('opens under the chevron with the tools in order, and turns the chevron to Close', async () => {
        renderMenu();
        await userEvent.click(screen.getByRole('button', { name: options }));
        const items = await screen.findAllByRole('menuitem');
        expect(items.map((item) => item.getAttribute('aria-label'))).toEqual([settings, remove]);
        expect(screen.getByRole('button', { name: en.InvitationEditor.close })).toHaveAttribute('aria-expanded', 'true');
    });

    it('closes on a pick and runs the tool', async () => {
        const { onDelete, onOpenChange, onSettings } = renderMenu({ open: true });
        await userEvent.click(await screen.findByRole('menuitem', { name: remove }));
        expect(onDelete).toHaveBeenCalledOnce();
        expect(onSettings).not.toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenLastCalledWith(false);
        await waitFor(() => expect(screen.queryByRole('menuitem')).toBeNull());
    });

    it('shows a single tool in place of the chevron, and nothing with no tools', async () => {
        const { onSettings, unmount } = renderMenu({ tools: ['settings'] });
        expect(screen.queryByRole('button', { name: options })).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: settings }));
        expect(onSettings).toHaveBeenCalledOnce();
        unmount();
        renderMenu({ tools: [] });
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('says it is busy while a photo uploads', () => {
        renderMenu({ uploading: true });
        expect(screen.getByRole('button', { name: options })).toHaveAttribute('aria-busy', 'true');
    });
});
