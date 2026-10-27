'use client';

import { type ChangeEvent, useMemo, useState } from 'react';

import { useCreateCampaignLink } from '@/hooks/useAdminCampaigns';
import {
    campaignDestinations,
    type CampaignLinkForm,
    campaignLinkFormProblem,
    type CampaignPresetKey,
    campaignUrl,
    emptyCampaignLinkForm,
    findCampaignPreset,
    requestOfCampaignLinkForm,
    toUtmValue,
} from '@/lib/campaignLinks';

type UtmField = 'utmSource' | 'utmMedium' | 'utmCampaign';

// The campaign link builder's state and actions. The drawer is remounted on every opening, so the
// form starts empty each time.
export function useCampaignLinkForm(onDone: () => void) {
    const create = useCreateCampaignLink();
    const destinations = useMemo(() => campaignDestinations(), []);
    const [form, setForm] = useState<CampaignLinkForm>(() => emptyCampaignLinkForm(destinations[0]?.path ?? '/'));
    const [error, setError] = useState<unknown>(null);
    // The problem shows only after a save attempt, so an empty new form isn't flagged at once.
    const [showProblem, setShowProblem] = useState(false);

    const problem = campaignLinkFormProblem(form);
    const url = campaignUrl(form);

    function handlePresetChange(event: ChangeEvent<HTMLSelectElement>) {
        const preset = findCampaignPreset(event.currentTarget.value as CampaignPresetKey);
        setForm((current) => ({ ...current, preset: preset.key, utmSource: preset.source, utmMedium: preset.medium }));
    }

    function handleDestinationChange(event: ChangeEvent<HTMLSelectElement>) {
        const destinationPath = event.currentTarget.value;
        setForm((current) => ({ ...current, destinationPath }));
    }

    // Changing a value the preset set turns it into Custom, so the picker never claims values it
    // didn't set. A partner's source is theirs to type.
    function handleUtmChange(event: ChangeEvent<HTMLInputElement>) {
        const field = event.currentTarget.name as UtmField;
        const value = toUtmValue(event.currentTarget.value);
        setForm((current) => {
            const preset = findCampaignPreset(current.preset);
            const next = { ...current, [field]: value };
            const presetHeld = next.utmMedium === preset.medium && (preset.key === 'partner' || next.utmSource === preset.source);
            return presetHeld ? next : { ...next, preset: 'custom' };
        });
    }

    function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
        const name = event.currentTarget.value;
        setForm((current) => ({ ...current, name }));
    }

    async function save() {
        if (problem) {
            setShowProblem(true);
            return;
        }
        setError(null);
        try {
            await create.mutateAsync(requestOfCampaignLinkForm(form));
            onDone();
        } catch (caught) {
            setError(caught);
        }
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (create.isPending) return;
        void save();
    }

    return {
        form,
        destinations,
        url,
        problem: showProblem ? problem : null,
        busy: create.isPending,
        error,
        handlePresetChange,
        handleDestinationChange,
        handleUtmChange,
        handleNameChange,
        handleSubmit,
    };
}
