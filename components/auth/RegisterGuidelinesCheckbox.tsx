'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { routes } from '@/lib/routes';

// Required: the backend refuses a registration without the current version
// (3037), so the form can't submit until this is ticked.
export function RegisterGuidelinesCheckbox({
    checked,
    onChangeAction,
}: {
    checked: boolean;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('RegisterPage.guidelines');

    return (
        <div className="flex items-start gap-3 rounded-xl px-1 py-1">
            <input
                id="register-guidelines"
                type="checkbox"
                required
                checked={checked}
                onChange={onChangeAction}
                className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="flex flex-col gap-0.5">
                <label htmlFor="register-guidelines" className="cursor-pointer text-sm text-ink">
                    {t('label')}
                </label>
                <Link
                    href={routes.legal.communityGuidelines()}
                    target="_blank"
                    rel="noopener"
                    className="text-xs font-semibold text-ink-muted underline hover:text-ink"
                >
                    {t('read')}
                </Link>
            </span>
        </div>
    );
}
