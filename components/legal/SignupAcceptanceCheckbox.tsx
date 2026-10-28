'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useId } from 'react';

import { useLegalDocLinks } from '@/hooks/useLegalDocLinks';

// The one box a new account ticks (register, the OAuth sign-up modal): the Terms, the
// Community Guidelines, the Privacy Policy and the 18+ confirmation (Terms §3) together.
export function SignupAcceptanceCheckbox({
    checked,
    onChangeAction,
}: {
    checked: boolean;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('AcceptanceCheckboxes');
    const links = useLegalDocLinks();
    const id = useId();

    return (
        <div className="flex items-start gap-3 px-1 py-1">
            <input id={id} type="checkbox" required checked={checked} onChange={onChangeAction} className="mt-0.5 size-4 shrink-0 accent-primary" />
            <label htmlFor={id} className="cursor-pointer text-sm text-ink">
                {t.rich('signup', links)}
            </label>
        </div>
    );
}
