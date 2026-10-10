'use client';

import { type ChangeEvent, useCallback, useState } from 'react';

import { useSaveCollaboratorBusinessDetails } from '@/hooks/useAdmin';
import {
    type BusinessDetailErrors,
    businessDetailsErrors,
    businessDetailsFromFormData,
    hasBusinessDetailErrors,
    rejectedBusinessDetails,
    serverBusinessDetailErrors,
} from '@/lib/adminCollaborations';
import type { CollaboratorResponseDto } from '@/lib/api/types';

const NO_ERRORS: BusinessDetailErrors = {};

export function useCollaboratorBusinessDrawer(collaborator: CollaboratorResponseDto, onCloseAction: () => void) {
    const save = useSaveCollaboratorBusinessDetails();
    const [fieldErrors, setFieldErrors] = useState<BusinessDetailErrors>(NO_ERRORS);
    // Tracked so the tax office reads as required for a Greek VAT number.
    const [countryCode, setCountryCode] = useState(collaborator.countryCode ?? '');

    const handleCountryChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => setCountryCode(event.target.value), []);

    const handleSubmit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            const input = businessDetailsFromFormData(new FormData(event.currentTarget));
            const errors = businessDetailsErrors(input);
            setFieldErrors(errors);
            if (hasBusinessDetailErrors(errors)) return;
            try {
                await save.mutateAsync({ id: collaborator.id, input });
                onCloseAction();
            } catch (error) {
                // The message shows through saveError; the fields the backend named are marked too.
                setFieldErrors(serverBusinessDetailErrors(error));
            }
        },
        [collaborator.id, onCloseAction, save],
    );

    // Clears a failed save so it doesn't reappear the next time the drawer opens.
    const handleClose = useCallback(() => {
        save.reset();
        onCloseAction();
    }, [onCloseAction, save]);

    return {
        fieldErrors,
        countryCode,
        taxOfficeRequired: countryCode === 'EL',
        handleCountryChange,
        handleSubmit,
        handleClose,
        isSaving: save.isPending,
        saveError: save.error,
        saveRejected: rejectedBusinessDetails(save.error),
    };
}
