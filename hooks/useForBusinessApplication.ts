'use client';

import { useLocale } from 'next-intl';
import type { SubmitEvent } from 'react';
import { useCallback, useState } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { getFieldErrors } from '@/lib/api/errors';
import type { PartnerApplicationResponseDto } from '@/lib/api/types';
import { type ApplicationError, applicationRequestFromFormData, toApplicationError } from '@/lib/forBusinessApplication';

// The partner apply form. UTM params are read at submit time from the address
// bar, so the page needs no useSearchParams (and no client-render bailout).
// The vendor "Become a partner" sheet passes its own `search` instead.
export function useForBusinessApplication({ search }: { search?: string } = {}) {
    const locale = useLocale();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState<ApplicationError | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleSubmit = useCallback(
        async (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (isSubmitting) return;
            setError(null);
            setFieldErrors({});
            setIsSubmitting(true);

            try {
                const body = applicationRequestFromFormData(new FormData(event.currentTarget), { locale, search: search ?? window.location.search });
                await api.publicPost<PartnerApplicationResponseDto>(endpoints.partnerProgram.applications, body);
                setIsSent(true);
            } catch (submitError) {
                setError(toApplicationError(submitError));
                setFieldErrors(getFieldErrors(submitError) ?? {});
            } finally {
                setIsSubmitting(false);
            }
        },
        [isSubmitting, locale, search],
    );

    return { error, fieldErrors, handleSubmit, isSent, isSubmitting };
}
