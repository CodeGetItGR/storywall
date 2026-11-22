'use client';

import type { ChangeEvent } from 'react';

import { FeatureAddonLabel } from '@/components/plan/FeatureAddonLabel';
import type { PaidServiceResponseDto } from '@/lib/api/types';

type FeatureAddonCheckRowProps = {
    service: PaidServiceResponseDto;
    checked: boolean;
    // Without it the add-on is always included and can't be unticked.
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
};

const ROW_CLASS = 'flex min-h-14 items-center gap-3 py-2';
const CHECKBOX_CLASS = 'h-5 w-5 shrink-0 accent-primary';

// One feature add-on as a checkbox row: its name and one-time price.
export function FeatureAddonCheckRow({ service, checked, onChange, disabled = false }: FeatureAddonCheckRowProps) {
    if (!onChange) {
        return (
            <label className={ROW_CLASS}>
                <input type="checkbox" checked disabled readOnly className={CHECKBOX_CLASS} />
                <FeatureAddonLabel service={service} />
            </label>
        );
    }
    return (
        <label className={`${ROW_CLASS} cursor-pointer has-disabled:cursor-not-allowed has-disabled:opacity-60`}>
            <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className={CHECKBOX_CLASS} />
            <FeatureAddonLabel service={service} />
        </label>
    );
}
