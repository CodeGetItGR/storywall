import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedBlockSheet } from '@/components/feed/edit/FeedBlockSheet';
import en from '@/messages/en.json';

// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

afterEach(cleanup);

function renderSheet(membersOnly: boolean | null, onMembersOnly = vi.fn()) {
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <FeedBlockSheet
                title="Dress code"
                open
                scope={null}
                groups={[]}
                parts={[]}
                partLabels={{} as never}
                isDesktop
                membersOnly={membersOnly}
                onMembersOnly={onMembersOnly}
                onOpenPart={vi.fn()}
                onClose={vi.fn()}
            />
        </NextIntlClientProvider>,
    );
    return onMembersOnly;
}

describe('FeedBlockSheet members only', () => {
    it('turns members only on and off', async () => {
        const onMembersOnly = renderSheet(false);
        const toggle = screen.getByRole('switch', { name: en.FeedLayout.membersOnly });
        expect((toggle as HTMLInputElement).checked).toBe(false);
        await userEvent.click(toggle);
        expect(onMembersOnly).toHaveBeenCalledExactlyOnceWith(true);
    });

    it("doesn't offer it on a block that can't be members only", () => {
        renderSheet(null);
        expect(screen.queryByRole('switch', { name: en.FeedLayout.membersOnly })).toBeNull();
    });
});
