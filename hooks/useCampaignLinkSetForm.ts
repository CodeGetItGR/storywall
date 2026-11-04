'use client';

import { type ChangeEvent, useRef, useState } from 'react';

import { useGenerateCampaignLinkSet } from '@/hooks/useAdminCampaigns';
import type { CampaignLinkLanguage } from '@/lib/api/types';
import { isUtmValue, toUtmValue } from '@/lib/campaignLinks';
import { DISCOUNT_CAMPAIGN_LINK_NAME_MAX } from '@/lib/discountCampaignForm';

// A language's set of links with no discount campaign behind it. Remounted on every opening.
// A submit while a request is running is ignored: the server answers a second request at the same
// moment with a 409. The ref closes the gap before the mutation reports it is pending.
export function useCampaignLinkSetForm(language: CampaignLinkLanguage, onDone: () => void) {
    const generate = useGenerateCampaignLinkSet();
    const [name, setName] = useState('');
    const [linkName, setLinkName] = useState('');
    const [error, setError] = useState<unknown>(null);
    const inFlight = useRef(false);
    // The server refuses a blank name and a link name that is not a UTM value, with no way to fix it here.
    const canSubmit = name.trim() !== '' && isUtmValue(linkName);

    function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
        setName(event.currentTarget.value);
    }

    function handleLinkNameChange(event: ChangeEvent<HTMLInputElement>) {
        setLinkName(toUtmValue(event.currentTarget.value).slice(0, DISCOUNT_CAMPAIGN_LINK_NAME_MAX));
    }

    async function save() {
        inFlight.current = true;
        setError(null);
        try {
            await generate.mutateAsync({ name: name.trim(), linkName, language });
            onDone();
        } catch (caught) {
            setError(caught);
        } finally {
            inFlight.current = false;
        }
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit || inFlight.current || generate.isPending) return;
        void save();
    }

    return { name, linkName, canSubmit, busy: generate.isPending, error, handleNameChange, handleLinkNameChange, handleSubmit };
}
