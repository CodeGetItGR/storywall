import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDraftServer } from '@/hooks/invitationDraftTestServer';
import { WithAuth } from '@/hooks/testAuthContext';
import { EDITOR_TOUR_SEEN_KEY } from '@/lib/invitation/editorTour';
import en from '@/messages/en.json';

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
// Embla needs matchMedia, which jsdom lacks. Same as the media integration test.
vi.mock('embla-carousel-react', () => ({
    default: () => [vi.fn(), { scrollPrev: vi.fn(), scrollNext: vi.fn(), on: vi.fn(), off: vi.fn(), selectedScrollSnap: () => 0 }],
}));
// jsdom has no ResizeObserver, and the gift section's IBAN box needs one.
vi.stubGlobal(
    'ResizeObserver',
    class {
        observe() {}
        disconnect() {}
    },
);
// jsdom has no media queries: a computer-wide screen, so the side panels dock beside the canvas.
vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
}));
// jsdom draws nothing, so there is nothing to scroll to.
Element.prototype.scrollIntoView = () => {};

const backend = createDraftServer();

// Each case renders the whole editor and waits on saves, the link check and the tour's delay,
// which can pass 5 seconds when the whole suite runs at once.
const EDITOR_FLOW_TIMEOUT_MS = 15_000;

async function openEditor() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <QueryClientProvider client={queryClient}>
                <WithAuth>
                    <InvitationEditorPage draftId="draft-1" />
                </WithAuth>
            </QueryClientProvider>
        </NextIntlClientProvider>,
    );
    return screen.findByLabelText('Text color');
}

function topBar() {
    return within(screen.getByRole('banner'));
}

async function openPublishSheet() {
    fireEvent.click(topBar().getByRole('button', { name: 'Publish' }));
    return within(await screen.findByRole('dialog', { name: 'Publish invitation' }));
}

describe('Invitation editor: publish', { timeout: EDITOR_FLOW_TIMEOUT_MS }, () => {
    beforeAll(() => backend.server.listen({ onUnhandledRequest: 'error' }));
    beforeEach(() => {
        localStorage.setItem(EDITOR_TOUR_SEEN_KEY, '1');
        router.push.mockReset();
        backend.putOnEvent('event-1');
    });
    afterEach(() => {
        cleanup();
        backend.server.resetHandlers();
        backend.reset();
        vi.restoreAllMocks();
    });
    afterAll(() => backend.server.close());

    it('saves, asks for the link the first time, then publishes', async () => {
        const color = await openEditor();
        fireEvent.change(color, { target: { value: '#112233' } });

        const sheet = await openPublishSheet();
        expect(backend.saves).toHaveLength(1);
        expect(sheet.getByText('invite.storywall.gr/')).toBeInTheDocument();
        expect(sheet.getByText("You can't change the link after publishing.")).toBeInTheDocument();
        expect(sheet.getByRole('button', { name: 'Publish' })).toBeDisabled();

        const field = sheet.getByLabelText('Invitation link');
        fireEvent.change(field, { target: { value: 'Maria-Nikos' } });
        expect(field).toHaveValue('maria-nikos');
        expect(await sheet.findByText('Available')).toBeInTheDocument();

        const open = vi.spyOn(window, 'open').mockReturnValue(null);
        fireEvent.click(sheet.getByRole('button', { name: 'Publish' }));

        expect(await screen.findByText('Your invitation is published.')).toBeInTheDocument();
        expect(backend.publishes).toEqual([{ revision: 5, slug: 'maria-nikos' }]);
        expect(screen.queryByRole('dialog', { name: 'Publish invitation' })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Open' }));
        expect(open).toHaveBeenCalledWith('/save-my-date/i/maria-nikos', '_blank', 'noopener');
    });

    it('says why a link cannot be used, and keeps Publish off', async () => {
        await openEditor();
        const sheet = await openPublishSheet();
        const field = sheet.getByLabelText('Invitation link');

        fireEvent.change(field, { target: { value: 'ab' } });
        expect(sheet.getByText('Use 3–60 lowercase Latin letters, numbers and hyphens.')).toBeInTheDocument();

        fireEvent.change(field, { target: { value: 'taken-link' } });
        expect(await sheet.findByText('Already taken')).toBeInTheDocument();
        expect(sheet.getByRole('button', { name: 'Publish' })).toBeDisabled();

        fireEvent.change(field, { target: { value: 'admin' } });
        expect(await sheet.findByText("This link isn't allowed.")).toBeInTheDocument();
        expect(backend.publishes).toHaveLength(0);
    });

    it('shows a link taken between the check and the publish', async () => {
        await openEditor();
        const sheet = await openPublishSheet();
        fireEvent.change(sheet.getByLabelText('Invitation link'), { target: { value: 'our-day' } });
        await sheet.findByText('Available');

        backend.takeSlug('our-day');
        fireEvent.click(sheet.getByRole('button', { name: 'Publish' }));

        expect(await sheet.findByText('Already taken')).toBeInTheDocument();
        expect(sheet.getByRole('button', { name: 'Publish' })).toBeDisabled();
        expect(backend.publication()).toBeNull();
    });

    it('publishes again straight away, without the link', async () => {
        backend.publishedAt('maria-nikos');
        await openEditor();

        fireEvent.click(topBar().getByRole('button', { name: 'Publish' }));

        expect(await screen.findByText('Your changes are published.')).toBeInTheDocument();
        expect(backend.publishes).toEqual([{ revision: 4 }]);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('sends the host to the plan when it has no Save my date', async () => {
        backend.publishedAt('maria-nikos');
        backend.refusePublish(5012);
        await openEditor();

        fireEvent.click(topBar().getByRole('button', { name: 'Publish' }));
        const dialog = within(await screen.findByRole('dialog'));
        expect(dialog.getByText("Your plan doesn't include the invitation.")).toBeInTheDocument();

        fireEvent.click(dialog.getByRole('button', { name: 'See plan' }));
        expect(router.push).toHaveBeenCalledWith('/events/event-1/manage?tab=plan');
    });

    it('says the plan has ended, and stays on "Not now"', async () => {
        backend.refusePublish(5217);
        await openEditor();
        const sheet = await openPublishSheet();
        fireEvent.change(sheet.getByLabelText('Invitation link'), { target: { value: 'our-day' } });
        await sheet.findByText('Available');
        fireEvent.click(sheet.getByRole('button', { name: 'Publish' }));

        expect(await screen.findByText("Your event's plan has ended.")).toBeInTheDocument();
        expect(screen.queryByRole('dialog', { name: 'Publish invitation' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('Not now', { selector: 'button' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(router.push).not.toHaveBeenCalled();
    });

    it('says when publishing fails', async () => {
        backend.publishedAt('maria-nikos');
        backend.refusePublish(5100);
        await openEditor();

        fireEvent.click(topBar().getByRole('button', { name: 'Publish' }));

        expect(await screen.findByText('Publishing failed. Try again.')).toBeInTheDocument();
    });
});

describe('Invitation editor: preview', { timeout: EDITOR_FLOW_TIMEOUT_MS }, () => {
    beforeAll(() => backend.server.listen({ onUnhandledRequest: 'error' }));
    beforeEach(() => localStorage.setItem(EDITOR_TOUR_SEEN_KEY, '1'));
    afterEach(() => {
        cleanup();
        backend.server.resetHandlers();
        backend.reset();
    });
    afterAll(() => backend.server.close());

    it('opens at phone width, switches to desktop, and the FAQ and gallery work in it', async () => {
        await openEditor();
        fireEvent.click(topBar().getByRole('button', { name: 'Preview' }));
        const preview = within(await screen.findByRole('dialog', { name: 'Preview' }));

        const frame = () => document.querySelector('[data-preview-width]');
        expect(frame()).toHaveAttribute('data-preview-width', 'mobile');
        expect(preview.getByRole('button', { name: 'Mobile' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(preview.getByRole('button', { name: 'Desktop' }));
        expect(frame()).toHaveAttribute('data-preview-width', 'desktop');

        // The editor's tools are not in the preview.
        expect(preview.queryByRole('button', { name: 'Add section' })).not.toBeInTheDocument();
        expect(preview.queryByRole('button', { name: 'Hide section' })).not.toBeInTheDocument();

        const question = preview.getByRole('button', { name: /Υπάρχει πάρκινγκ;/ });
        expect(question).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(question);
        expect(question).toHaveAttribute('aria-expanded', 'true');

        // A gallery photo opens full screen.
        fireEvent.click(preview.getByRole('img', { name: /^Φωτογραφία 1 από/ }));
        const lightbox = await screen.findByRole('dialog', { name: /^Φωτογραφία 1 από/ });
        expect(within(lightbox).getByRole('button', { name: 'Επόμενη φωτογραφία' })).toBeInTheDocument();
    });
});

describe('Invitation editor: tour', { timeout: EDITOR_FLOW_TIMEOUT_MS }, () => {
    beforeAll(() => backend.server.listen({ onUnhandledRequest: 'error' }));
    beforeEach(() => localStorage.removeItem(EDITOR_TOUR_SEEN_KEY));
    afterEach(() => {
        cleanup();
        backend.server.resetHandlers();
        backend.reset();
    });
    afterAll(() => backend.server.close());

    const tourCard = () => screen.findByRole('dialog', { name: 'Welcome' }, { timeout: 3000 });

    it('opens by itself the first time, and walks through every step to Done', async () => {
        await openEditor();
        const card = await tourCard();
        expect(card).toHaveTextContent('1 / 6');
        expect(localStorage.getItem(EDITOR_TOUR_SEEN_KEY)).toBe('1');

        const titles = ['Edit text', 'Add a section', 'Check before publishing', 'Section tools', 'Publish your invitation'];
        for (const title of titles) {
            fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Next' }));
            expect(await screen.findByRole('dialog', { name: title })).toBeInTheDocument();
        }
        expect(within(screen.getByRole('dialog')).queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();

        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('steps back, lists the section tools, and skips', async () => {
        await openEditor();
        await tourCard();
        const next = () => fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Next' }));
        for (let step = 0; step < 4; step += 1) next();

        const tools = within(await screen.findByRole('dialog', { name: 'Section tools' }));
        expect(tools.getByText('Hide section')).toBeInTheDocument();
        expect(tools.getByText('Drag to move')).toBeInTheDocument();
        expect(tools.getByText('Section options')).toBeInTheDocument();

        fireEvent.click(tools.getByRole('button', { name: 'Back' }));
        expect(await screen.findByRole('dialog', { name: 'Check before publishing' })).toBeInTheDocument();

        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Skip' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('closes on Escape and starts again from the help button', async () => {
        await openEditor();
        await tourCard();
        fireEvent.keyDown(document, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

        fireEvent.click(topBar().getByRole('button', { name: 'Editor tour' }));
        expect(await screen.findByRole('dialog', { name: 'Welcome' })).toBeInTheDocument();
    });

    it('does not open by itself once seen', async () => {
        localStorage.setItem(EDITOR_TOUR_SEEN_KEY, '1');
        await openEditor();
        await new Promise((resolve) => setTimeout(resolve, 1200));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
