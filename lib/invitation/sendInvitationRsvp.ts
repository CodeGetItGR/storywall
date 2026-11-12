'use server';

import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';

import { ApiError } from '@/lib/api/client';
import { rateLimitedMessage } from '@/lib/api/errorMessageKeys';
import { clientIpFrom, clientIpHeaders } from '@/lib/auth/springAuth';
import type { DateLanguage } from '@/lib/invitation/dateDisplay';
import { isInvitationSlug } from '@/lib/invitation/inviteHost';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { publicInvitationRsvpEndpoint } from '@/lib/invitation/publishedInvitation';
import { type RsvpOutcome, type RsvpReply, rsvpRequestBody } from '@/lib/invitation/rsvp';
import { rsvpOutcome } from '@/lib/invitation/rsvpOutcome';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

async function readBody(res: Response): Promise<unknown> {
    try {
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    } catch {
        return null;
    }
}

// A guest's reply from a published invitation, sent from this server so the
// guest's address goes along: each guest counts against the backend's rate
// limit alone instead of every guest sharing this server's. The answer is in
// the invitation's own language. The page binds the link and the language.
export async function sendInvitationRsvp(slug: string, language: DateLanguage, reply: RsvpReply): Promise<RsvpOutcome> {
    const lang: DateLanguage = language === 'en' ? 'en' : 'el';
    const labels = INVITATION_LABELS[lang];
    if (!showsSaveMyDate() || !isInvitationSlug(slug)) return { ok: false, reload: true };

    let error: ApiError | null;
    try {
        const res = await fetch(`${API_BASE_URL}${publicInvitationRsvpEndpoint(slug)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept-Language': lang, ...clientIpHeaders(clientIpFrom(await headers())) },
            body: JSON.stringify(rsvpRequestBody(reply)),
            cache: 'no-store',
        });
        error = res.ok ? null : new ApiError(res.status, await readBody(res), undefined, res.headers.get('Retry-After'));
    } catch {
        return { ok: false, message: labels.rsvpError };
    }

    if (!error) return { ok: true };

    const t = await getTranslations({ locale: lang, namespace: 'ApiErrors' });
    return rsvpOutcome(error, {
        phoneInvalid: labels.rsvpPhoneInvalid,
        closed: labels.rsvpClosed,
        failed: labels.rsvpError,
        rateLimited: (seconds) => {
            const message = rateLimitedMessage(seconds);
            return t(message.key, message.values);
        },
    });
}
