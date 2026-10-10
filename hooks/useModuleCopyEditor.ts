'use client';

import { useMemo, useState } from 'react';

import { useEventTypeModuleMatrix, useUpdateEventTypeModule } from '@/hooks/useEventTypeModuleMatrix';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { type AdminErrorMessageKey, adminErrorMessageKey } from '@/lib/adminUtils';
import { getModuleCopyErrorTarget } from '@/lib/api/errors';
import type { EventTypeConvention, EventTypeModulePatchDto } from '@/lib/api/types';
import {
    hasModuleCopyOverride,
    MODULE_COPY_FIELDS,
    type ModuleCopyDraft,
    moduleCopyDraft,
    type ModuleCopyField,
    type ModuleCopyLocale,
    moduleCopyPatch,
} from '@/lib/planModules';

type ModuleCopyError = { key: AdminErrorMessageKey; field?: string; locale?: string };

// The event type drawer's module names: one row per module the type supports,
// and the editor for the one opened.
export function useModuleCopyEditor(eventTypeKey: EventTypeConvention | null) {
    const matrix = useEventTypeModuleMatrix(eventTypeKey);
    const update = useUpdateEventTypeModule();
    const defaults = useModuleCopy(null);
    const localizedText = useLocalizedText();

    const [openModuleKey, setOpenModuleKey] = useState<string | null>(null);
    const [draft, setDraft] = useState<ModuleCopyDraft | null>(null);
    const [localError, setLocalError] = useState<ModuleCopyError | null>(null);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

    const rows = useMemo(
        () =>
            (matrix.data ?? [])
                .filter((row) => row.applicability === 'DEFAULT_ON')
                .sort((left, right) => left.sortOrder - right.sortOrder)
                .map((row) => {
                    const fallback = defaults(row.moduleKey);
                    return {
                        moduleKey: row.moduleKey,
                        name: localizedText(row.name) || fallback.name,
                        defaultName: fallback.name,
                        isCustom: hasModuleCopyOverride(row),
                        Icon: fallback.Icon,
                        source: row,
                    };
                }),
        [defaults, localizedText, matrix.data],
    );
    const openRow = rows.find((row) => row.moduleKey === openModuleKey) ?? null;

    const serverError: ModuleCopyError | null = update.error
        ? { key: adminErrorMessageKey(update.error), ...getModuleCopyErrorTarget(update.error) }
        : null;
    const error = localError ?? serverError;
    // 3056/3057 point at one input; anything else (5156 included) sits under the form.
    const inputError =
        error &&
        (error.key === 'moduleCopyIncomplete' || error.key === 'moduleCopyTooLong') &&
        MODULE_COPY_FIELDS.includes(error.field as ModuleCopyField)
            ? error
            : null;

    function open(moduleKey: string) {
        const row = rows.find((item) => item.moduleKey === moduleKey);
        if (!row) return;
        update.reset();
        setLocalError(null);
        setDraft(moduleCopyDraft(row.source));
        setOpenModuleKey(moduleKey);
    }

    function close() {
        update.reset();
        setLocalError(null);
        setIsResetConfirmOpen(false);
        setOpenModuleKey(null);
    }

    function setValue(field: ModuleCopyField, locale: ModuleCopyLocale, value: string) {
        setLocalError(null);
        setDraft((current) => (current ? { ...current, [field]: { ...current[field], [locale]: value } } : current));
    }

    async function send(input: EventTypeModulePatchDto) {
        if (!eventTypeKey || !openModuleKey) return;
        try {
            await update.mutateAsync({ eventTypeKey, moduleKey: openModuleKey, input });
            close();
        } catch {
            // Shown through update.error.
        }
    }

    function save() {
        if (!draft) return;
        const result = moduleCopyPatch(draft);
        if ('incomplete' in result) {
            setLocalError({ key: 'moduleCopyIncomplete', ...result.incomplete });
            return;
        }
        void send(result.patch);
    }

    function reset() {
        void send(Object.fromEntries(MODULE_COPY_FIELDS.map((field) => [field, null])));
    }

    // The error's key when the backend (or the draft check) points at this input.
    function fieldError(field: ModuleCopyField, locale: ModuleCopyLocale): AdminErrorMessageKey | null {
        return inputError && inputError.field === field && (!inputError.locale || inputError.locale === locale) ? inputError.key : null;
    }

    return {
        rows,
        isLoading: matrix.isLoading,
        loadError: matrix.error,
        openRow,
        draft,
        setValue,
        open,
        close,
        save,
        isSaving: update.isPending,
        fieldError,
        // An error not tied to one input, e.g. the module was switched off meanwhile.
        formError: error && !inputError ? error.key : null,
        isResetConfirmOpen,
        requestReset: () => setIsResetConfirmOpen(true),
        cancelReset: () => setIsResetConfirmOpen(false),
        reset,
    };
}
