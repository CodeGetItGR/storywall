'use client';

import type React from 'react';
import { useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useContentLimits } from '@/hooks/useContentLimits';
import { useSettingsPartSave } from '@/hooks/useSettingsPartSave';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { changedTextFields } from '@/lib/settingsPreview';

type FormArgs = { event: EventDetailResponseDto; onSaved: () => void };

// The title editor: today's single required field.
export function useSettingsTitleForm({ event, onSaved }: FormArgs) {
    const limits = useContentLimits();
    const [title, setTitle] = useState(event.title);
    const { save, isSaving, errorMessage } = useSettingsPartSave(event.id, onSaved);
    const patch = changedTextFields({ title }, { title: event.title });

    function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setTitle(e.target.value);
    }

    function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!title.trim()) return;
        void save(patch);
    }

    return {
        title,
        maxLength: limits.eventTitleMaxLength,
        handleTitleChange,
        handleSubmit,
        isSaving,
        errorMessage,
        canSave: Boolean(title.trim()) && Object.keys(patch).length > 0,
    };
}

// The description editor: today's optional text with its counter.
export function useSettingsDescriptionForm({ event, onSaved }: FormArgs) {
    const { data: appConfig } = useAppConfig();
    const maxLength = appConfig?.contentLimits.eventDescriptionMaxLength ?? 2000;
    const initial = event.description ?? '';
    const [description, setDescription] = useState(initial);
    const { save, isSaving, errorMessage } = useSettingsPartSave(event.id, onSaved);
    const patch = changedTextFields({ description }, { description: initial });

    function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setDescription(e.target.value.slice(0, maxLength));
    }

    function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        void save(patch);
    }

    return {
        description,
        maxLength,
        handleDescriptionChange,
        handleSubmit,
        isSaving,
        errorMessage,
        canSave: Object.keys(patch).length > 0,
    };
}

// The location editor: the place's name and address (both required) and the maps link.
export function useSettingsLocationForm({ event, onSaved }: FormArgs) {
    const limits = useContentLimits();
    const initial = {
        locationName: event.location.name ?? '',
        locationAddress: event.location.address ?? '',
        mapsUrl: event.location.mapsUrl ?? '',
    };
    const [locationName, setLocationName] = useState(initial.locationName);
    const [locationAddress, setLocationAddress] = useState(initial.locationAddress);
    const [mapsUrl, setMapsUrl] = useState(initial.mapsUrl);
    const { save, isSaving, errorMessage } = useSettingsPartSave(event.id, onSaved);
    const patch = changedTextFields({ locationName, locationAddress, mapsUrl }, initial);
    const isComplete = Boolean(locationName.trim() && locationAddress.trim());

    function handleLocationNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setLocationName(e.target.value);
    }

    function handleLocationAddressChange(e: React.ChangeEvent<HTMLInputElement>) {
        setLocationAddress(e.target.value);
    }

    function handleMapsUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
        setMapsUrl(e.target.value);
    }

    function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!isComplete) return;
        void save(patch);
    }

    return {
        locationName,
        locationAddress,
        mapsUrl,
        limits,
        handleLocationNameChange,
        handleLocationAddressChange,
        handleMapsUrlChange,
        handleSubmit,
        isSaving,
        errorMessage,
        canSave: isComplete && Object.keys(patch).length > 0,
    };
}
