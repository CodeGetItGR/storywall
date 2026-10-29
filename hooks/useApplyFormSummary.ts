'use client';

import { useState } from 'react';

import { type ApplyFormDefaults, filledApplyFields, type PrefillableApplyField } from '@/lib/forBusinessApplication';

// Fields the vendor's details already fill (the in-app sheet) collapse into a summary with an Edit button, so only
// the missing ones show as inputs. A server error on a filled field opens them all again so it can be fixed.
export function useApplyFormSummary(defaults: ApplyFormDefaults | undefined, fieldErrors: Record<string, string>) {
    const [editing, setEditing] = useState(false);
    const filled = filledApplyFields(defaults);
    const collapsed = filled.length > 0 && !editing && !filled.some((field) => !!fieldErrors[field]);

    function showsInput(field: PrefillableApplyField) {
        return !collapsed || !filled.includes(field);
    }

    function edit() {
        setEditing(true);
    }

    return { collapsed, filled, showsInput, edit };
}
