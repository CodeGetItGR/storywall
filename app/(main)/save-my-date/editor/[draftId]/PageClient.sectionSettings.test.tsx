import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDraftServer } from '@/hooks/invitationDraftTestServer';
import { TEST_USER, testAuth, WithAuth } from '@/hooks/testAuthContext';
import { EDITOR_TOUR_SEEN_KEY } from '@/lib/invitation/editorTour';
import en from '@/messages/en.json';
import { AuthContext } from '@/providers/AuthProvider';

import InvitationEditorPage from './PageClient';

// Hoisted above the imports, so the API client reads it when it loads. Same as TEST_API.
vi.hoisted(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
});

const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/save-my-date/editor/draft-1' }));
vi.mock('@/lib/inAppHistory', () => ({ hasInAppPrevious: () => true }));
// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));
vi.stubGlobal(
    'ResizeObserver',
    class {
        observe() {}
        disconnect() {}
    },
);

// jsdom has no media queries. A computer-wide screen unless a test says otherwise.
const screenSize = vi.hoisted(() => ({ wide: true }));
vi.stubGlobal('matchMedia', (query: string) => ({
    matches: screenSize.wide && query.includes('min-width'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
}));

const backend = createDraftServer();

// Only the role matters to the editor.
const ADMIN = testAuth({ user: { ...TEST_USER, role: 'ADMIN' } });
// Signed out, Publish saves and then asks to sign in, so it stands in for saving.
const SIGNED_OUT = testAuth({ user: null });

async function openEditor({ asAdmin = false } = {}) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const signedIn = (children: ReactNode) => (asAdmin ? <AuthContext.Provider value={ADMIN}>{children}</AuthContext.Provider> : children);
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <QueryClientProvider client={queryClient}>
                <WithAuth value={SIGNED_OUT}>{signedIn(<InvitationEditorPage draftId="draft-1" />)}</WithAuth>
            </QueryClientProvider>
        </NextIntlClientProvider>,
    );
    await screen.findByLabelText('Text color');
}

// A section on the canvas, by the name the add list gives it.
function section(name: string) {
    return screen.getByRole('group', { name });
}

function openSettings(name: string) {
    fireEvent.click(within(section(name)).getByRole('button', { name: 'Section settings' }));
}

// The docked settings beside the canvas.
function panel(name: string) {
    return screen.getByRole('complementary', { name });
}

async function save() {
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await screen.findByText('Sign in to publish');
}

function storedSection(id: string) {
    return backend.stored().document.sections.find((item) => item.id === id)!;
}

describe('Invitation editor: section settings', () => {
    beforeAll(() => backend.server.listen({ onUnhandledRequest: 'error' }));
    // The tour would cover the editor; the tour has its own tests.
    beforeEach(() => localStorage.setItem(EDITOR_TOUR_SEEN_KEY, '1'));
    afterEach(() => {
        cleanup();
        backend.server.resetHandlers();
        backend.reset();
        screenSize.wide = true;
    });
    afterAll(() => backend.server.close());

    it('opens beside the canvas in place of the text settings, and Done brings them back', async () => {
        await openEditor();
        openSettings('Date');

        expect(panel('Date')).toBeInTheDocument();
        expect(screen.queryByLabelText('Text color')).not.toBeInTheDocument();

        fireEvent.click(within(panel('Date')).getByRole('button', { name: 'Done' }));
        expect(screen.queryByRole('complementary', { name: 'Date' })).not.toBeInTheDocument();
        expect(screen.getByLabelText('Text color')).toBeInTheDocument();
    });

    it('changes the date layout live, undoes it as one step, and saves it', async () => {
        await openEditor();
        openSettings('Date');
        const layouts = within(panel('Date')).getByRole('radiogroup', { name: 'Date layout' });

        fireEvent.click(within(layouts).getByRole('radio', { name: 'Calendar' }));
        expect(within(layouts).getByRole('radio', { name: 'Calendar' })).toHaveAttribute('aria-checked', 'true');

        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(within(layouts).getByRole('radio', { name: 'Calendar' })).toHaveAttribute('aria-checked', 'false');

        fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
        await save();
        expect(storedSection('s-date')).toMatchObject({ data: { displayStyle: 'calendar' } });
    });

    it('adds a moment to the schedule and edits it on its own', async () => {
        await openEditor();
        openSettings('Event schedule');
        const settings = panel('Event schedule');

        fireEvent.click(within(settings).getByRole('button', { name: 'Add moment' }));
        const title = within(settings).getByLabelText('Text');
        fireEvent.change(title, { target: { value: 'Δείπνο' } });
        fireEvent.blur(title);
        fireEvent.click(within(within(settings).getByRole('group', { name: 'Moment' })).getByRole('button', { name: 'Done' }));

        expect(within(settings).getByRole('button', { name: /Δείπνο/ })).toBeInTheDocument();
        await save();
        const program = storedSection('s-program');
        expect(program.type === 'program' && program.data.items.map((item) => item.label)).toEqual(['Μυστήριο', 'Δείπνο']);
    });

    it('keeps a bad link out and saves a good one', async () => {
        await openEditor();
        openSettings('Accommodation');
        const settings = panel('Accommodation');
        fireEvent.click(within(settings).getByRole('button', { name: /Ξενοδοχείο/ }));
        const website = within(settings).getByLabelText('Website');

        fireEvent.change(website, { target: { value: 'not a link' } });
        fireEvent.blur(website);
        expect(website).toHaveAttribute('aria-invalid', 'true');
        expect(within(settings).getByText("This link isn't valid.")).toBeInTheDocument();

        fireEvent.change(website, { target: { value: 'hotel.gr' } });
        fireEvent.blur(website);
        expect(website).not.toHaveAttribute('aria-invalid');

        await save();
        const stays = storedSection('s-accommodation');
        expect(stays.type === 'accommodation' && stays.data.items[0].website).toBe('https://hotel.gr');
    });

    it('shows hosts no footer settings and no admin-only settings', async () => {
        await openEditor();
        expect(within(section('Footer')).queryByRole('button', { name: 'Section settings' })).not.toBeInTheDocument();

        openSettings('Countdown');
        expect(within(panel('Countdown')).queryByRole('heading', { name: 'Background effect' })).not.toBeInTheDocument();
        expect(within(panel('Countdown')).queryByText('Font')).not.toBeInTheDocument();
    });

    it('gives admins the footer and the background effect', async () => {
        await openEditor({ asAdmin: true });
        openSettings('Footer');
        expect(panel('Footer')).toBeInTheDocument();

        fireEvent.click(within(panel('Footer')).getByRole('button', { name: 'Done' }));
        openSettings('Countdown');
        expect(within(panel('Countdown')).getByRole('heading', { name: 'Background effect' })).toBeInTheDocument();
    });

    it('opens in a sheet on phones, with the canvas still live', async () => {
        screenSize.wide = false;
        await openEditor();
        openSettings('Dress code');

        const sheet = await screen.findByRole('dialog', { name: 'Dress code' });
        fireEvent.click(within(sheet).getByRole('button', { name: 'Add color' }));
        expect(within(sheet).getAllByRole('button', { name: /^Remove color/ })).toHaveLength(3);

        fireEvent.click(within(sheet).getByRole('button', { name: 'Done' }));
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Dress code' })).not.toBeInTheDocument());
        await save();
        const dressCode = storedSection('s-dressCode');
        expect(dressCode.type === 'dressCode' && dressCode.data.colors).toEqual(['#b8dfd3', '#efe7ec', '#efe7ec']);
    });
});
