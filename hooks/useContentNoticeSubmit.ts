'use client';

import { useLocale } from 'next-intl';
import { useCallback, useState } from 'react';

import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode, getFieldErrors, isRateLimitedError } from '@/lib/api/errors';
import type { ContentNoticeReceiptDto, ContentNoticeRequestDto, NoticeCategory } from '@/lib/api/types';

export const NOTICE_LIMITS = { location: [10, 2000], explanation: [10, 5000], link: 2000, name: 200, email: 320 } as const;

// 'invalid' is a form-level message (3001 with no field map, or any other 400);
// 'fieldErrors' means the field map was applied to the fields below.
export type ContentNoticeError = 'invalid' | 'fieldErrors' | 'rateLimited' | 'failed';

export interface ContentNoticeDraft {
    category: NoticeCategory | null;
    locationText: string;
    link: string;
    explanation: string;
    notifierName: string;
    notifierEmail: string;
    goodFaith: boolean;
    website: string;
}

export type ContentNoticeFieldKey = Exclude<keyof ContentNoticeDraft, 'website'>;
export type ContentNoticeFieldErrors = Partial<Record<ContentNoticeFieldKey, string>>;

const EMPTY: ContentNoticeDraft = {
    category: null,
    locationText: '',
    link: '',
    explanation: '',
    notifierName: '',
    notifierEmail: '',
    goodFaith: false,
    website: '',
};

const FIELD_KEYS: readonly ContentNoticeFieldKey[] = [
    'category',
    'locationText',
    'link',
    'explanation',
    'notifierName',
    'notifierEmail',
    'goodFaith',
];

// Same shape as the backend pattern (?i)^\s*https?://\S+\s*$, applied to the trimmed value.
const HTTP_LINK = /^https?:\/\/\S+$/i;

function within(value: string, [min, max]: readonly [number, number]) {
    const length = value.trim().length;
    return length >= min && length <= max;
}

export function isDraftValid(d: ContentNoticeDraft): boolean {
    if (!d.category || !d.goodFaith) return false;
    if (!within(d.locationText, NOTICE_LIMITS.location) || !within(d.explanation, NOTICE_LIMITS.explanation)) return false;
    const link = d.link.trim();
    if (link && (link.length > NOTICE_LIMITS.link || !HTTP_LINK.test(link))) return false;
    // Art. 16(2)(c): a child-sexual-abuse notice may be anonymous.
    if (d.category === 'CHILD_SEXUAL_ABUSE') return true;
    return d.notifierName.trim().length > 0 && d.notifierEmail.trim().length > 0;
}

function pickFieldErrors(error: unknown): ContentNoticeFieldErrors {
    const raw = getFieldErrors(error);
    if (!raw) return {};
    const picked: ContentNoticeFieldErrors = {};
    for (const key of FIELD_KEYS) {
        if (typeof raw[key] === 'string') picked[key] = raw[key];
    }
    return picked;
}

const blankToNull = (s: string) => (s.trim() ? s.trim() : null);

export function useContentNoticeSubmit() {
    const locale = useLocale();
    const [draft, setDraft] = useState<ContentNoticeDraft>(EMPTY);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<ContentNoticeError | null>(null);
    const [fieldErrors, setFieldErrors] = useState<ContentNoticeFieldErrors>({});
    const [reference, setReference] = useState<string | null>(null);

    const setField = useCallback(<K extends keyof ContentNoticeDraft>(key: K, value: ContentNoticeDraft[K]) => {
        setDraft((current) => ({ ...current, [key]: value }));
        setError(null);
        setFieldErrors((current) => (key in current ? { ...current, [key]: undefined } : current));
    }, []);

    async function submit() {
        if (isSubmitting || !isDraftValid(draft) || !draft.category) return;
        setIsSubmitting(true);
        setError(null);
        setFieldErrors({});
        try {
            const body: ContentNoticeRequestDto = {
                category: draft.category,
                locationText: draft.locationText.trim(),
                link: blankToNull(draft.link),
                explanation: draft.explanation.trim(),
                notifierName: blankToNull(draft.notifierName),
                notifierEmail: blankToNull(draft.notifierEmail),
                goodFaith: true,
                // Real people leave the honeypot empty. A bot that filled it gets a decoy receipt.
                website: draft.website,
                locale,
            };
            const receipt = await api.publicPost<ContentNoticeReceiptDto>(endpoints.contentNotices.submit, body);
            setReference(receipt.reference);
        } catch (submitError) {
            if (isRateLimitedError(submitError)) {
                setError('rateLimited');
            } else if (submitError instanceof ApiError && submitError.status === 400) {
                const code = getErrorCode(submitError);
                const fields = pickFieldErrors(submitError);
                if (code === ERROR_CODES.MALFORMED_REQUEST_BODY) {
                    setError('failed');
                } else if (Object.keys(fields).length > 0) {
                    setFieldErrors(fields);
                    setError('fieldErrors');
                } else {
                    setError('invalid');
                }
            } else {
                setError('failed');
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return { draft, setField, submit, isSubmitting, error, fieldErrors, reference, canSubmit: isDraftValid(draft) };
}
