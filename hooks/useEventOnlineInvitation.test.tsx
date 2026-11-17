import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { storyEvent, storyModules } from '@/.storybook/fixtures';
import { WithAuth } from '@/hooks/testAuthContext';
import { useEventOnlineInvitation } from '@/hooks/useEventOnlineInvitation';
import type { InvitationDraftSummaryDto } from '@/lib/invitation/drafts';
import type { InvitationPublicationDto } from '@/lib/invitation/publication';
import { takeStartIntent } from '@/lib/invitation/startIntent';
import en from '@/messages/en.json';

// Hoisted above the imports, so the API client reads it when it loads.
vi.hoisted(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
});

const API = 'http://api.test';
const event = storyEvent({ id: 'evt-1', modules: [...storyModules(), { ...storyModules()[0], moduleKey: 'save_my_date' }] });
const summary = (eventId: string | null): InvitationDraftSummaryDto => ({
    id: `draft-${eventId}`,
    themeSlug: 'olive',
    themeName: 'Olive',
    eventType: 'WEDDING',
    eventId,
    revision: 3,
    updatedAt: '2026-11-01T10:00:00Z',
});
const publication = (state: Partial<InvitationPublicationDto> = {}): InvitationPublicationDto => ({
    draftId: 'draft-evt-1',
    slug: 'maria-nikos',
    draftRevision: 3,
    themeRevision: 1,
    publishedAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z',
    onlineUntil: '2027-06-15T10:00:00Z',
    online: true,
    ...state,
});

const server = setupServer();

function renderInvitation(target = event) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <NextIntlClientProvider locale="en" messages={en}>
            <QueryClientProvider client={queryClient}>
                <WithAuth>{children}</WithAuth>
            </QueryClientProvider>
        </NextIntlClientProvider>
    );
    return renderHook(() => useEventOnlineInvitation(target, { enabled: true }), { wrapper });
}

describe('useEventOnlineInvitation', () => {
    beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
    afterEach(() => {
        server.resetHandlers();
        sessionStorage.clear();
    });
    afterAll(() => server.close());

    it('shows the published invitation on this event with its link and end date', async () => {
        server.use(
            http.get(`${API}/api/invitation-drafts`, () => HttpResponse.json([summary(null), summary('evt-2'), summary('evt-1')])),
            http.get(`${API}/api/invitation-drafts/draft-evt-1/publication`, () => HttpResponse.json(publication())),
        );
        const { result } = renderInvitation();

        await waitFor(() => expect(result.current.status).toBe('live'));
        expect(result.current).toMatchObject({
            liveUntil: 'Jun 15, 2027',
            publicUrl: expect.stringMatching(/^https:\/\/invite\..+\/maria-nikos$/),
            editHref: '/save-my-date/editor/draft-evt-1',
            planMissing: false,
            locked: false,
            canExtend: true,
        });
    });

    it('reads a draft never published, and one whose time ran out', async () => {
        server.use(
            http.get(`${API}/api/invitation-drafts`, () => HttpResponse.json([summary('evt-1')])),
            http.get(`${API}/api/invitation-drafts/draft-evt-1/publication`, () => HttpResponse.json({ status: 404 }, { status: 404 })),
        );
        const first = renderInvitation();
        await waitFor(() => expect(first.result.current.status).toBe('draft'));
        expect(first.result.current.canExtend).toBe(false);

        server.use(http.get(`${API}/api/invitation-drafts/draft-evt-1/publication`, () => HttpResponse.json(publication({ online: false }))));
        const second = renderInvitation();
        await waitFor(() => expect(second.result.current.status).toBe('offline'));
        expect(second.result.current).toMatchObject({ liveUntil: null, canExtend: true });
    });

    it('starts from the catalogue of the event type, remembering the event', async () => {
        server.use(http.get(`${API}/api/invitation-drafts`, () => HttpResponse.json([summary('evt-2')])));
        const { result } = renderInvitation(storyEvent({ id: 'evt-1' }));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current).toMatchObject({ status: 'none', planMissing: true, locked: true, catalogueHref: '/invitations?type=WEDDING' });
        result.current.chooseTheme();
        expect(takeStartIntent()).toEqual({ eventId: 'evt-1', eventType: 'WEDDING' });
    });

    it('keeps a draft behind the upgrade without the plan, and a published invitation in view', async () => {
        const planless = storyEvent({ id: 'evt-1' });
        server.use(
            http.get(`${API}/api/invitation-drafts`, () => HttpResponse.json([summary('evt-1')])),
            http.get(`${API}/api/invitation-drafts/draft-evt-1/publication`, () => HttpResponse.json({ status: 404 }, { status: 404 })),
        );
        const draft = renderInvitation(planless);
        await waitFor(() => expect(draft.result.current.status).toBe('draft'));
        expect(draft.result.current).toMatchObject({ planMissing: true, locked: true, addOnHref: null });

        server.use(http.get(`${API}/api/invitation-drafts/draft-evt-1/publication`, () => HttpResponse.json(publication({ online: false }))));
        const published = renderInvitation(planless);
        await waitFor(() => expect(published.result.current.status).toBe('offline'));
        expect(published.result.current).toMatchObject({ planMissing: true, locked: false });
    });

    it('is not locked when the plan includes the invitation', async () => {
        server.use(http.get(`${API}/api/invitation-drafts`, () => HttpResponse.json([])));
        const { result } = renderInvitation();
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current).toMatchObject({ status: 'none', planMissing: false, locked: false });
    });
});
