import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedBlockButtons } from '@/components/feed/edit/FeedBlockButtons';
import en from '@/messages/en.json';

afterEach(cleanup);

function renderButtons() {
    const on = { onPhoto: vi.fn(), onColor: vi.fn() };
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <FeedBlockButtons color="#333333" uploading={false} {...on} />
        </NextIntlClientProvider>,
    );
    return on;
}

describe('FeedBlockButtons', () => {
    it('picks a photo', async () => {
        const on = renderButtons();
        const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
        fireEvent.change(screen.getByLabelText(en.FeedEditor.addPhoto), { target: { files: [file] } });
        await waitFor(() => expect(on.onPhoto).toHaveBeenCalledWith(file));
    });

    it("sets the block's text colour", () => {
        const on = renderButtons();
        fireEvent.input(screen.getByLabelText(en.InvitationEditor.textColor), { target: { value: '#aa0000' } });
        expect(on.onColor).toHaveBeenCalledWith('#aa0000');
    });
});
