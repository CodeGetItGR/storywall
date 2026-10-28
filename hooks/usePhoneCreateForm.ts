'use client';

import { type ChangeEvent, useState } from 'react';

import { useCreateAdminDevice } from '@/hooks/useAdminDevices';
import { devicePairingPayload } from '@/lib/adminDevices';
import type { AdminDeviceCreatedDto } from '@/lib/api/types';

type Problem = 'name';

// Name → pair → the one-time QR payload. The key lives only in this state; the drawer remounts on
// every opening, so closing it drops the key for good.
export function usePhoneCreateForm() {
    const create = useCreateAdminDevice();
    const [name, setName] = useState('');
    const [showProblem, setShowProblem] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [created, setCreated] = useState<AdminDeviceCreatedDto | null>(null);

    const trimmed = name.trim();
    const problem: Problem | null = trimmed.length === 0 ? 'name' : null;

    function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
        setName(event.target.value);
    }

    async function save() {
        if (problem) {
            setShowProblem(true);
            return;
        }
        setError(null);
        try {
            setCreated(await create.mutateAsync({ name: trimmed }));
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
        name,
        handleNameChange,
        handleSubmit,
        busy: create.isPending,
        problem: showProblem ? problem : null,
        error,
        created,
        pairingPayload: created ? devicePairingPayload(created.key) : null,
    };
}
