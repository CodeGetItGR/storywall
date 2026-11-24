import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedModuleBlock } from '@/components/feed/layout/FeedModuleBlock';
import en from '@/messages/en.json';

// The app config isn't read here: the names come from the messages.
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));

afterEach(cleanup);

function renderBlock(available: boolean, underTools?: boolean) {
    return render(
        <NextIntlClientProvider locale="en" messages={en}>
            <FeedModuleBlock module="playlist" eventType="WEDDING" href="/events/e1/tools/playlist" available={available} underTools={underTools} />
        </NextIntlClientProvider>,
    );
}

describe('FeedModuleBlock', () => {
    it("shows the module's name and opens its tool", () => {
        renderBlock(true);
        expect(screen.getByText(en.Modules.playlist.name)).toBeTruthy();
        expect(screen.getByRole('link', { name: en.FeedEditor.moduleOpen }).getAttribute('href')).toBe('/events/e1/tools/playlist');
    });

    it("leaves room for its tools while editing only", () => {
        const { container, unmount } = renderBlock(true, true);
        expect(container.firstElementChild).toHaveClass('pt-18');
        unmount();
        expect(renderBlock(true).container.firstElementChild).not.toHaveClass('pt-18');
    });

    it('has no working button once the module is gone', () => {
        renderBlock(false);
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByRole('button', { name: en.FeedEditor.moduleOpen }).hasAttribute('disabled')).toBe(true);
    });
});
