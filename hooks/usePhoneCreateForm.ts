'use client';

import { type ChangeEvent, useRef, useState } from 'react';

import { useCreateAdminDevice } from '@/hooks/useAdminDevices';
import { devicePairingPayload } from '@/lib/adminDevices';
import type { AdminDeviceCreatedDto } from '@/lib/api/types';

type Problem = 'name';

// Name → pair → the one-time QR payload. The key is kept in this hook's state only: the mutation has
// gcTime 0 and is reset right after the call, so React Query keeps no copy. The drawer's owner remounts
// the drawer (and so drops the key) once its close animation ends, and again on the next opening.
export function usePhoneCreateForm() {
    const create = useCreateAdminDevice();
    const [name, setName] = useState('');
    const [showProblem, setShowProblem] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [created, setCreated] = useState<AdminDeviceCreatedDto | null>(null);
    // Set before the first await, so a second submit before the next render can't create a second phone.
    const inFlight = useRef(false);

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
        if (inFlight.current) return;
        inFlight.current = true;
        setError(null);
        try {
            const result = await create.mutateAsync({ name: trimmed });
            // Detach the observer from the finished mutation, so it holds no copy of the key either.
            create.reset();
            setCreated(result);
        } catch (caught) {
            setError(caught);
        } finally {
            inFlight.current = false;
        }
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
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
