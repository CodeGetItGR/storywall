'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDisclosure } from '@/hooks/useDisclosure';
import { useCreateEventMember, useEventMembers } from '@/hooks/useEventMembers';
import { readStoredDemoActAs, setDemoActAsMember, storeDemoActAs } from '@/lib/demo/demoActAs';

// Who the admin posts as on a demo event: themselves, or one of the event's account-less guests.
export function useDemoActAs(eventId: string) {
    const members = useEventMembers(eventId);
    const createMember = useCreateEventMember();
    const addDialog = useDisclosure();
    const [storedId, setStoredId] = useState<string | null>(() => readStoredDemoActAs(eventId));

    const guests = useMemo(() => (members.data ?? []).filter((member) => !member.userId), [members.data]);
    // A guest that was removed since falls back to the host.
    const selectedId = guests.some((guest) => guest.id === storedId) ? storedId : null;

    useEffect(() => {
        setDemoActAsMember(selectedId ? { eventId, memberId: selectedId } : null);
        return () => setDemoActAsMember(null);
    }, [eventId, selectedId]);

    const select = useCallback(
        (memberId: string | null) => {
            setStoredId(memberId);
            storeDemoActAs(eventId, memberId);
        },
        [eventId],
    );

    const handleSelectChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => select(event.target.value || null), [select]);

    const { toggle: toggleAddDialog } = addDialog;
    const { mutate: createGuest, reset: resetCreate } = createMember;

    const openAddDialog = useCallback(() => {
        resetCreate();
        toggleAddDialog();
    }, [resetCreate, toggleAddDialog]);

    const handleAddGuest = useCallback(
        (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            const displayName = String(new FormData(event.currentTarget).get('displayName') ?? '').trim();
            if (!displayName) return;
            createGuest(
                { eventId, role: 'ATTENDEE', displayName, joinedAt: new Date().toISOString() },
                {
                    onSuccess: (member) => {
                        select(member.id);
                        toggleAddDialog();
                    },
                },
            );
        },
        [createGuest, eventId, select, toggleAddDialog],
    );

    return {
        guests,
        selectedId,
        handleSelectChange,
        addDialog,
        openAddDialog,
        handleAddGuest,
        isAdding: createMember.isPending,
        addError: createMember.error,
    };
}
