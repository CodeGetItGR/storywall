'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { PARTNER_ROLES } from '@/lib/adminPartnerBranding';
import type { PartnerRole } from '@/lib/api/types';
import { typesFromDraft } from '@/lib/planModuleConfig';

// The vendor types a module setting allows, one checkbox each. The draft is the picked types joined by commas.
export function PlanModuleTypesField({
    label,
    value,
    onChangeAction,
}: {
    label: string;
    value: string;
    onChangeAction: (role: PartnerRole, checked: boolean) => void;
}) {
    const t = useTranslations('AdminPage.collaborations.feedCard.roles');
    const picked = typesFromDraft(value);

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        onChangeAction(event.currentTarget.value as PartnerRole, event.currentTarget.checked);
    }

    return (
        <fieldset>
            <legend className="mb-1.5 text-[11px] font-bold tracking-wide text-ink-muted uppercase">{label}</legend>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {PARTNER_ROLES.map((role) => (
                    <label key={role} className="flex min-h-8 items-center gap-2 text-sm text-ink">
                        <input type="checkbox" value={role} checked={picked.includes(role)} onChange={handleChange} className="h-4 w-4 accent-ink" />
                        {t(role)}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
