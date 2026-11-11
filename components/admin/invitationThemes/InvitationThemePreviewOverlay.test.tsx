import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvitationThemePreviewOverlay } from '@/components/admin/invitationThemes/InvitationThemePreviewOverlay';
import { type AdminInvitationThemeDto, BLANK_THEME_DESIGN, blankThemeDocument } from '@/lib/adminInvitationThemes';
import messages from '@/messages/en.json';

const server = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: server.get },
}));
vi.mock('@/components/saveMyDate/invitation/InvitationRenderer', () => ({
    InvitationRenderer: ({ document, media }: { document: { themeId: string }; media: (id: string) => string | undefined }) => (
        <p>
            {document.themeId}:{media('a1')}
        </p>
    ),
}));

const THEME = {
    id: 't1',
    status: 'HIDDEN',
    name: 'Hidden one',
    slug: 'hidden-one',
    eventType: 'WEDDING',
    design: BLANK_THEME_DESIGN,
    document: blankThemeDocument('WEDDING', 'hidden-one'),
    assets: [{ assetId: 'a1', url: 'https://cdn.test/a1.webp' }],
} as unknown as AdminInvitationThemeDto;

function respond(theme: unknown) {
    server.get.mockImplementation((path: string) => Promise.resolve(path.startsWith('/api/invitation-fonts') ? [] : theme));
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <NextIntlClientProvider locale="en" messages={messages}>
                <InvitationThemePreviewOverlay themeId="t1" onCloseAction={vi.fn()} />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('InvitationThemePreviewOverlay', () => {
    it('draws a hidden theme from the admin API, with its images', async () => {
        respond(THEME);
        expect(await screen.findByText('hidden-one:https://cdn.test/a1.webp')).toBeInTheDocument();
        expect(server.get).toHaveBeenCalledWith('/api/admin/invitation-themes/t1');
        expect(screen.getByRole('button', { name: 'Close preview' })).toBeInTheDocument();
    });

    it('says when the theme can’t be drawn', async () => {
        respond({ ...THEME, design: { nope: true } });
        expect(await screen.findByText("This theme can't be shown.")).toBeInTheDocument();
    });
});
