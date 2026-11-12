import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { storyEvent, storyMember } from '@/.storybook/fixtures';
import { createDraftServer, TEST_API } from '@/hooks/invitationDraftTestServer';
import { testAuth, WithAuth } from '@/hooks/testAuthContext';
import { readDraftToken, saveDraftToken } from '@/lib/invitation/draftTokens';
import { EDITOR_TOUR_SEEN_KEY } from '@/lib/invitation/editorTour';
import { sampleInvitationPlan } from '@/lib/invitation/samplePlan';
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
// jsdom can't leave the page: the checkout redirect is only recorded.
const checkout = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@/lib/billing', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/billing')>()),
    navigateToCheckout: checkout.navigate,
}));
vi.stubGlobal(
    'ResizeObserver',
    class {
        observe() {}
        disconnect() {}
    },
);
vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
}));
Element.prototype.scrollIntoView = () => {};

const backend = createDraftServer();

// Each case renders the whole editor and waits on saves and the event step's loads.
const EDITOR_FLOW_TIMEOUT_MS = 15_000;

const wedding = storyEvent({ id: 'evt-wedding' });
const created: unknown[] = [];

// The host's events, the plans that sell the invitation, and paying for a new event.
function eventStepHandlers({ events }: { events: boolean }) {
    return [
        http.get(`${TEST_API}/api/me/events`, () =>
            HttpResponse.json(events ? [storyMember({ id: 'mem-host', eventId: wedding.id, role: 'HOST' })] : []),
        ),
        http.get(`${TEST_API}/api/events/:eventId`, () => HttpResponse.json(wedding)),
        http.get(`${TEST_API}/api/invitation-drafts`, () => HttpResponse.json([])),
        http.get(`${TEST_API}/api/plan-tiers`, () => HttpResponse.json([sampleInvitationPlan()])),
        http.get(`${TEST_API}/api/config`, () =>
            HttpResponse.json({
                withdrawal: { termsVersion: 'v1' },
                modules: [],
                media: { presignedUrlTtlMinutes: 60 },
                translations: { eventTypes: {}, modules: {} },
            }),
        ),
        http.get(`${TEST_API}/api/me/business-profile`, () => HttpResponse.json({ status: 404 }, { status: 404 })),
        http.post(`${TEST_API}/api/events`, async ({ request }) => {
            created.push(await request.json());
            return HttpResponse.json({ id: 'evt-new' });
        }),
        http.post(`${TEST_API}/api/events/:eventId/checkout`, () =>
            HttpResponse.json({ orderId: 'ord-1', redirectUrl: 'https://pay.example.test/session' }),
        ),
    ];
}

async function openEditor({ signedIn = true } = {}) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <QueryClientProvider client={queryClient}>
                <WithAuth value={testAuth({ user: signedIn ? undefined : null })}>
                    <InvitationEditorPage draftId="draft-1" />
                </WithAuth>
            </QueryClientProvider>
        </NextIntlClientProvider>,
    );
    await screen.findByLabelText('Text color');
}

function publish() {
    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Publish' }));
}

describe('Invitation editor: from draft to event', { timeout: EDITOR_FLOW_TIMEOUT_MS }, () => {
    beforeAll(() => backend.server.listen({ onUnhandledRequest: 'error' }));
    beforeEach(() => {
        localStorage.setItem(EDITOR_TOUR_SEEN_KEY, '1');
        created.length = 0;
        checkout.navigate.mockReset();
    });
    afterEach(() => {
        cleanup();
        backend.server.resetHandlers();
        backend.reset();
        localStorage.clear();
        sessionStorage.clear();
    });
    afterAll(() => backend.server.close());

    it('puts the draft on one of the host events, then asks for the link', async () => {
        backend.server.use(...eventStepHandlers({ events: true }));
        await openEditor();
        publish();

        const step = within(await screen.findByRole('dialog', { name: 'Choose the event' }));
        fireEvent.click(await step.findByRole('button', { name: /Eleni & Nikos/ }));

        expect(await screen.findByRole('dialog', { name: 'Publish invitation' })).toBeInTheDocument();
        expect(backend.attaches).toEqual(['evt-wedding']);
        expect(backend.stored().eventId).toBe('evt-wedding');
    });

    it('makes a new event from the invitation and goes to payment', async () => {
        backend.server.use(...eventStepHandlers({ events: false }));
        await openEditor();
        publish();

        const step = within(await screen.findByRole('dialog', { name: 'Choose a plan' }));
        // The invitation has the names and a date ahead, so only the plan and the consent are left.
        expect(step.queryByLabelText('Event name')).not.toBeInTheDocument();
        const pay = step.getByRole('button', { name: 'Continue to payment' });
        expect(pay).toBeDisabled();
        for (const box of await step.findAllByRole('checkbox')) fireEvent.click(box);
        await waitFor(() => expect(pay).toBeEnabled());
        fireEvent.click(pay);

        await waitFor(() => expect(checkout.navigate).toHaveBeenCalledOnce());
        expect(checkout.navigate).toHaveBeenCalledWith(
            'evt-new',
            expect.objectContaining({ orderId: 'ord-1' }),
            'PREMIUM',
            '/save-my-date/editor/draft-1?publish=1',
        );
        expect(created).toEqual([
            expect.objectContaining({ eventType: 'WEDDING', planTierCode: 'PREMIUM', coverageOptionId: 'opt-3m', title: expect.any(String) }),
        ]);
        expect(backend.attaches).toEqual(['evt-new']);
    });

    it('asks a visitor to sign in, and claims the draft once signed in', async () => {
        saveDraftToken('draft-1', 'tok-visitor', null);
        await openEditor({ signedIn: false });
        publish();
        expect(await screen.findByRole('dialog')).toHaveTextContent('Sign in to publish');
        expect(backend.claims).toEqual([]);
        cleanup();

        backend.putOnEvent('evt-wedding');
        await openEditor();
        await waitFor(() => expect(backend.claims).toEqual(['tok-visitor']));
        expect(readDraftToken('draft-1')).toBeNull();
    });
});
