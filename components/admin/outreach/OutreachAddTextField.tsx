'use client';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import type { OutreachAddFormState } from '@/hooks/useOutreachAddForm';
import { OUTREACH_TEXT_MAX, type ProspectDraft } from '@/lib/adminOutreach';

type TextField = Exclude<keyof ProspectDraft, 'kind' | 'priority'>;

const LONG_TEXT_MAX = 2000;

export function OutreachAddTextField({
    form,
    field,
    label,
    required,
    hint,
    type = 'text',
    list,
    multiline = false,
    maxLength,
    className,
}: {
    form: OutreachAddFormState;
    field: TextField;
    label: string;
    required?: boolean;
    hint?: string;
    type?: 'text' | 'email' | 'tel';
    list?: string;
    multiline?: boolean;
    maxLength?: number;
    className?: string;
}) {
    const invalid = Boolean(form.errors[field]);

    return (
        <AdminField label={label} required={required} optional={!required && !multiline} hint={hint} className={className}>
            {multiline ? (
                <textarea
                    name={field}
                    value={form.draft[field]}
                    onChange={form.handleChange}
                    rows={2}
                    maxLength={maxLength ?? LONG_TEXT_MAX}
                    aria-invalid={invalid || undefined}
                    className={adminInputClass('resize-y')}
                />
            ) : (
                <input
                    name={field}
                    type={type}
                    value={form.draft[field]}
                    onChange={form.handleChange}
                    list={list}
                    maxLength={maxLength ?? OUTREACH_TEXT_MAX * 3}
                    autoComplete="off"
                    aria-invalid={invalid || undefined}
                    className={adminInputClass(invalid ? 'border-status-danger' : undefined)}
                />
            )}
        </AdminField>
    );
}
