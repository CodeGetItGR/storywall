// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { INVITATION_LABELS } from '@/lib/invitation/labels';
import type { RsvpReply } from '@/lib/invitation/rsvp';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }) }));
// The real ApiErrors copy, in the language asked for.
vi.mock('next-intl/server', () => ({
    getTranslations: async ({ locale }: { locale: 'el' | 'en' }) => {
        const messages = (locale === 'en' ? en : el).ApiErrors as Record<string, string>;
        return (key: string, values: Record<string, unknown> = {}) =>
            messages[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));
    },
}));

import { sendInvitationRsvp } from '@/lib/invitation/sendInvitationRsvp';

const fetchMock = vi.fn();

const reply: RsvpReply = {
    guestName: 'Maria',
    attendanceStatus: 'ATTENDING',
    phone: '694 123 4567',
    email: 'maria@example.com',
    adultCount: 2,
    childCount: 1,
    notes: 'Vegetarian menu',
    website: '',
};

function answer(status: number, body: unknown = null, init: ResponseInit = {}) {
    return new Response(body === null ? null : JSON.stringify(body), { status, ...init });
}

const problem = (status: number, errorCode: number, detail = '') => ({ type: 'about:blank', title: 'x', status, detail, instance: '/', errorCode, errorKey: 'x' });

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('sendInvitationRsvp', () => {
    it("posts the reply to the invitation's RSVP route, in its language, with the guest address", async () => {
        vi.stubEnv('CLIENT_IP_FORWARDING_SECRET', 'shh');
        fetchMock.mockResolvedValue(answer(204));

        await expect(sendInvitationRsvp('maria-and-nikos', 'en', reply)).resolves.toEqual({ ok: true });

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toMatch(/\/api\/public\/invitations\/maria-and-nikos\/rsvp$/);
        expect(init.method).toBe('POST');
        expect(init.cache).toBe('no-store');
        expect(init.headers).toEqual({
            'Content-Type': 'application/json',
            'Accept-Language': 'en',
            'X-Storywall-Client-Ip': '203.0.113.7',
            'X-Storywall-Client-Ip-Secret': 'shh',
        });
        expect(JSON.parse(init.body as string)).toEqual(reply);
    });

    it('answers in Greek for a Greek invitation, with the app copy for the rate limit', async () => {
        fetchMock.mockResolvedValue(answer(429, problem(429, 3010), { headers: { 'Retry-After': '1800' } }));
        await expect(sendInvitationRsvp('maria-and-nikos', 'el', reply)).resolves.toEqual({
            ok: false,
            message: el.ApiErrors.rateLimitedWithWaitMinutes.replace('{minutes}', '30'),
        });
        expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({ 'Accept-Language': 'el' });
    });

    it("shows the backend's deadline and replies-full messages and the form's own copy for the other refusals", async () => {
        fetchMock.mockResolvedValueOnce(answer(409, problem(409, 5222, 'Replies for this event closed on the RSVP deadline.')));
        await expect(sendInvitationRsvp('maria-and-nikos', 'en', reply)).resolves.toEqual({
            ok: false,
            message: 'Replies for this event closed on the RSVP deadline.',
        });

        const full = 'Αυτή η εκδήλωση δεν μπορεί να δεχτεί άλλες απαντήσεις μέσω της πρόσκλησης. Παρακαλούμε επικοινωνήστε με τους διοργανωτές.';
        fetchMock.mockResolvedValueOnce(answer(409, problem(409, 5223, full)));
        await expect(sendInvitationRsvp('maria-and-nikos', 'el', reply)).resolves.toEqual({ ok: false, message: full });

        fetchMock.mockResolvedValueOnce(answer(409, problem(409, 5012)));
        await expect(sendInvitationRsvp('maria-and-nikos', 'en', reply)).resolves.toEqual({ ok: false, message: INVITATION_LABELS.en.rsvpClosed });

        fetchMock.mockResolvedValueOnce(answer(410, problem(410, 5221)));
        await expect(sendInvitationRsvp('maria-and-nikos', 'en', reply)).resolves.toEqual({ ok: false, reload: true });
    });

    it('fails with the form copy when the backend cannot be reached', async () => {
        fetchMock.mockRejectedValue(new TypeError('fetch failed'));
        await expect(sendInvitationRsvp('maria-and-nikos', 'el', reply)).resolves.toEqual({ ok: false, message: INVITATION_LABELS.el.rsvpError });
    });

    it('sends nothing for a link that cannot be an invitation, or before launch on production', async () => {
        await expect(sendInvitationRsvp('../admin', 'el', reply)).resolves.toEqual({ ok: false, reload: true });

        vi.stubEnv('VERCEL_ENV', 'production');
        vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
        await expect(sendInvitationRsvp('maria-and-nikos', 'el', reply)).resolves.toEqual({ ok: false, reload: true });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
