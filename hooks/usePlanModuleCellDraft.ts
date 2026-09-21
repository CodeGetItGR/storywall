'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useSetPlanModules } from '@/hooks/useAdmin';
import { useUpdatePlanModuleConfig } from '@/hooks/usePlanModuleConfigs';
import type { PlanTierResponseDto } from '@/lib/api/types';
import {
    type ConfigChange,
    configChangeSummary,
    type ConfigObject,
    knownConfigFields,
    knownDraftFromConfig,
    mergeConfigDraft,
    parseConfigJson,
    splitConfig,
} from '@/lib/planModuleConfig';
import type { PlanModuleCell } from '@/lib/planModuleGrid';

export type EditableCell = Extract<PlanModuleCell, { kind: 'included' | 'excluded' }>;

export type PendingCellSave = {
    includedBefore: boolean;
    includedAfter: boolean;
    configBefore: ConfigObject;
    configAfter: ConfigObject;
    changes: ConfigChange[];
};

export function usePlanModuleCellDraft({ cell, plan, onSavedAction }: { cell: EditableCell; plan: PlanTierResponseDto; onSavedAction: () => void }) {
    const t = useTranslations('AdminPage');
    const updateConfig = useUpdatePlanModuleConfig();
    const setPlanModules = useSetPlanModules();

    const initialSplit = useMemo(() => splitConfig(cell.moduleKey, cell.config), [cell.config, cell.moduleKey]);
    const [included, setIncluded] = useState(cell.kind === 'included');
    const [knownDraft, setKnownDraft] = useState<Record<string, string>>(() => knownDraftFromConfig(cell.moduleKey, cell.config));
    const [jsonText, setJsonText] = useState(() => (Object.keys(initialSplit.unknown).length ? JSON.stringify(initialSplit.unknown, null, 2) : ''));
    const [pending, setPending] = useState<PendingCellSave | null>(null);

    const fields = useMemo(() => knownConfigFields(cell.moduleKey), [cell.moduleKey]);
    const parsedJson = useMemo(() => parseConfigJson(jsonText), [jsonText]);

    const fieldErrors = useMemo(() => {
        const errors: Record<string, string> = {};
        for (const field of fields) {
            if (field.type !== 'number') continue;
            const text = (knownDraft[field.key] ?? '').trim();
            if (!text) continue;
            const value = Number(text);
            if (!Number.isInteger(value) || (field.min !== undefined && value < field.min)) {
                errors[field.key] = t('plans.grid.cell.invalidNumber', { min: field.min ?? 0 });
            }
        }
        return errors;
    }, [fields, knownDraft, t]);

    const jsonError = parsedJson.ok ? null : t('plans.grid.cell.invalidJson');

    const configAfter = useMemo(
        () => mergeConfigDraft(cell.moduleKey, knownDraft, parsedJson.ok ? parsedJson.value : initialSplit.unknown),
        [cell.moduleKey, initialSplit.unknown, knownDraft, parsedJson]
    );
    const changes = useMemo(() => configChangeSummary(cell.config, configAfter, t('none')), [cell.config, configAfter, t]);
    const includedChanged = included !== (cell.kind === 'included');
    const canSave = !jsonError && Object.keys(fieldErrors).length === 0 && (changes.length > 0 || includedChanged);

    const handleKnownChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.currentTarget;
        setKnownDraft((current) => ({ ...current, [name]: value }));
    }, []);
    const handleJsonChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setJsonText(event.currentTarget.value), []);
    const handleIncludedChange = useCallback((next: boolean) => setIncluded(next), []);

    const resetToSeed = useCallback(() => {
        const seedSplit = splitConfig(cell.moduleKey, cell.seedConfig);
        setKnownDraft(knownDraftFromConfig(cell.moduleKey, cell.seedConfig));
        setJsonText(Object.keys(seedSplit.unknown).length ? JSON.stringify(seedSplit.unknown, null, 2) : '');
    }, [cell.moduleKey, cell.seedConfig]);

    const requestSave = useCallback(() => {
        if (!canSave) return;
        setPending({
            includedBefore: cell.kind === 'included',
            includedAfter: included,
            configBefore: cell.config,
            configAfter,
            changes,
        });
    }, [canSave, cell.config, cell.kind, changes, configAfter, included]);

    const cancelSave = useCallback(() => setPending(null), []);

    const confirmSave = useCallback(async () => {
        if (!pending) return;
        if (pending.changes.length > 0) {
            await updateConfig.mutateAsync({ planId: plan.id, moduleKey: cell.moduleKey, input: { defaultConfig: pending.configAfter } });
        }
        if (pending.includedBefore !== pending.includedAfter) {
            const moduleKeys = pending.includedAfter ? [...plan.moduleKeys, cell.moduleKey] : plan.moduleKeys.filter((key) => key !== cell.moduleKey);
            await setPlanModules.mutateAsync({ planId: plan.id, moduleKeys });
        }
        setPending(null);
        onSavedAction();
    }, [cell.moduleKey, onSavedAction, pending, plan.id, plan.moduleKeys, setPlanModules, updateConfig]);

    return {
        fields,
        included,
        knownDraft,
        jsonText,
        fieldErrors,
        jsonError,
        canSave,
        pending,
        isSaving: updateConfig.isPending || setPlanModules.isPending,
        error: updateConfig.error ?? setPlanModules.error ?? null,
        handleKnownChange,
        handleJsonChange,
        handleIncludedChange,
        resetToSeed,
        requestSave,
        cancelSave,
        confirmSave,
    };
}
