'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useId } from 'react';

import { useLegalDocLinks } from '@/hooks/useLegalDocLinks';

// The two boxes the acceptance gate shows again: the documents, and the 18+
// confirmation (Terms §3). A new account ticks SignupAcceptanceCheckbox instead.
// 'all' names the Terms, the Community Guidelines and the Privacy Policy; 'terms'
// leaves out the Guidelines, for an account that only owes the Terms. A QR-link
// upload, with no account, asks for 16+ instead (minimumAge).
export function AcceptanceCheckboxes({
    documents = 'all',
    minimumAge = 18,
    accepted,
    adultConfirmed,
    onAcceptedChangeAction,
    onAdultConfirmedChangeAction,
}: {
    documents?: 'all' | 'terms';
    minimumAge?: 16 | 18;
    accepted: boolean;
    adultConfirmed: boolean;
    onAcceptedChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onAdultConfirmedChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('AcceptanceCheckboxes');
    const links = useLegalDocLinks();
    const acceptedId = useId();
    const adultId = useId();

    return (
        <div className="flex flex-col gap-2 px-1 py-1">
            {/* Documents */}
            <div className="flex items-start gap-3">
                <input
                    id={acceptedId}
                    type="checkbox"
                    required
                    checked={accepted}
                    onChange={onAcceptedChangeAction}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                />
                <label htmlFor={acceptedId} className="cursor-pointer text-sm text-ink">
                    {documents === 'all' ? t.rich('all', links) : t.rich('termsOnly', links)}
                </label>
            </div>

            {/* 18+ */}
            <div className="flex items-start gap-3">
                <input
                    id={adultId}
                    type="checkbox"
                    required
                    checked={adultConfirmed}
                    onChange={onAdultConfirmedChangeAction}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                />
                <label htmlFor={adultId} className="cursor-pointer text-sm text-ink">
                    {minimumAge === 16 ? t('age16') : t('adult')}
                </label>
            </div>
        </div>
    );
}
