'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import type { AdminEmailTemplateDto, AdminEmailTemplateKey } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function AccountEmailTemplatePicker({
    templates,
    value,
    onChangeAction,
}: {
    templates: AdminEmailTemplateDto[];
    value: AdminEmailTemplateKey | null;
    onChangeAction: (template: AdminEmailTemplateKey) => void;
}) {
    const t = useTranslations('AdminPage.accounts.emails');
    const unavailable = templates.filter((item) => !item.available && item.unavailableReason);

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onChangeAction(event.currentTarget.dataset.template as AdminEmailTemplateKey);
    }

    return (
        <section aria-labelledby="email-template-heading">
            <h3 id="email-template-heading" className="mb-2 text-xs font-bold tracking-wide text-ink-faint uppercase">
                {t('template')}
            </h3>
            {/* Options */}
            <div role="group" aria-labelledby="email-template-heading" className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1 sm:grid-cols-4">
                {templates.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        data-template={item.key}
                        onClick={handleClick}
                        disabled={!item.available}
                        aria-pressed={value === item.key}
                        className={cn(
                            'rounded-md px-2 py-1.5 text-[12.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                            value === item.key ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                        )}
                    >
                        {t(`templates.${item.key}`)}
                    </button>
                ))}
            </div>
            {value ? <p className="mt-2 text-xs leading-5 text-ink-faint">{t(`templateHints.${value}`)}</p> : null}
            {/* Unavailable */}
            {unavailable.length > 0 ? (
                <ul className="mt-2 space-y-0.5 text-xs leading-5 text-ink-faint">
                    {unavailable.map((item) => (
                        <li key={item.key}>
                            <span className="font-semibold">{t(`templates.${item.key}`)}:</span> {t(`unavailable.${item.unavailableReason}`)}
                        </li>
                    ))}
                </ul>
            ) : null}
        </section>
    );
}
