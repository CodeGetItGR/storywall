'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useClearDemoPersonaAvatar, useSetDemoPersonaAvatar } from '@/hooks/useDemoPersonaAvatar';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useCreateEventMember, useEventMembers } from '@/hooks/useEventMembers';
import { playlistKeys } from '@/hooks/usePlaylist';
import { storyKeys } from '@/hooks/useStories';
import { readStoredDemoActAs, setDemoActAsMember, storeDemoActAs } from '@/lib/demo/demoActAs';
import { postKeys } from '@/lib/postQueries';

// Who the admin posts as on a demo event: themselves, or one of the event's account-less guests.
export function useDemoActAs(eventId: string) {
    const queryClient = useQueryClient();
    const members = useEventMembers(eventId);
    const createMember = useCreateEventMember();
    const setAvatar = useSetDemoPersonaAvatar(eventId);
    const clearAvatar = useClearDemoPersonaAvatar(eventId);
    const addDialog = useDisclosure();
    const [storedId, setStoredId] = useState<string | null>(() => readStoredDemoActAs(eventId));
    // Set when the guest was created but its photo didn't upload: a resubmit retries the photo only.
    const [pendingPhotoMemberId, setPendingPhotoMemberId] = useState<string | null>(null);

    const guests = useMemo(() => (members.data ?? []).filter((member) => !member.userId), [members.data]);
    // A guest that was removed since falls back to the host.
    const selectedId = guests.some((guest) => guest.id === storedId) ? storedId : null;
    const selectedGuest = guests.find((guest) => guest.id === selectedId) ?? null;

    useEffect(() => {
        setDemoActAsMember(selectedId ? { eventId, memberId: selectedId } : null);
        // Posts, songs and stories say what is "mine" for whoever is acted as: refetch them as the new persona.
        for (const queryKey of [postKeys.list(eventId), ['posts'], playlistKeys.suggestions(eventId), storyKeys.list(eventId), ['stories']]) {
            void queryClient.invalidateQueries({ queryKey });
        }
        return () => setDemoActAsMember(null);
    }, [eventId, queryClient, selectedId]);

    const select = useCallback(
        (memberId: string | null) => {
            setStoredId(memberId);
            storeDemoActAs(eventId, memberId);
        },
        [eventId],
    );

    const handleSelectChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => select(event.target.value || null), [select]);

    const { toggle: toggleAddDialog, close: closeDialog } = addDialog;
    const { mutate: createGuest, reset: resetCreate } = createMember;
    const { mutate: uploadAvatar, reset: resetSetAvatar, isPending: isUploadingPhoto } = setAvatar;
    const { mutate: removeAvatar, reset: resetClearAvatar } = clearAvatar;

    const openAddDialog = useCallback(() => {
        resetCreate();
        resetSetAvatar();
        setPendingPhotoMemberId(null);
        toggleAddDialog();
    }, [resetCreate, resetSetAvatar, toggleAddDialog]);

    const closeAddDialog = useCallback(() => {
        closeDialog();
        // Resetting a pending mutation detaches it: its outcome would never arrive.
        if (isUploadingPhoto) return;
        setPendingPhotoMemberId(null);
        resetSetAvatar();
    }, [closeDialog, isUploadingPhoto, resetSetAvatar]);

    // close, never toggle: the admin may have dismissed the dialog while this was in flight.
    const submitGuest = useCallback(
        ({ displayName, file }: { displayName: string; file: File | null }) => {
            const finish = (memberId: string) => {
                select(memberId);
                if (!file) {
                    setPendingPhotoMemberId(null);
                    closeDialog();
                    return;
                }
                uploadAvatar(
                    { memberId, file },
                    {
                        onSuccess: () => {
                            setPendingPhotoMemberId(null);
                            closeDialog();
                        },
                        onError: () => setPendingPhotoMemberId(memberId),
                    },
                );
            };

            // The guest already exists: only the photo is left to retry.
            if (pendingPhotoMemberId) {
                finish(pendingPhotoMemberId);
                return;
            }
            if (!displayName) return;
            createGuest({ eventId, role: 'ATTENDEE', displayName, joinedAt: new Date().toISOString() }, { onSuccess: (member) => finish(member.id) });
        },
        [closeDialog, createGuest, eventId, pendingPhotoMemberId, select, uploadAvatar],
    );

    const handleAddGuest = useCallback(
        (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const photo = form.get('photo');
            submitGuest({
                displayName: String(form.get('displayName') ?? '').trim(),
                file: photo instanceof File && photo.size > 0 ? photo : null,
            });
        },
        [submitGuest],
    );

    const handlePhotoChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0] ?? null;
            // Reset so picking the same file again still fires a change event.
            event.target.value = '';
            if (!file || !selectedId) return;
            // Only the latest photo action's error is shown in the bar.
            resetClearAvatar();
            uploadAvatar({ memberId: selectedId, file });
        },
        [resetClearAvatar, selectedId, uploadAvatar],
    );

    const handleRemovePhoto = useCallback(() => {
        if (!selectedId) return;
        resetSetAvatar();
        removeAvatar(selectedId);
    }, [removeAvatar, resetSetAvatar, selectedId]);

    // Photo state follows the selected guest: another guest's upload or error isn't this one's.
    const settingSelected = selectedId !== null && setAvatar.variables?.memberId === selectedId;
    const clearingSelected = selectedId !== null && clearAvatar.variables === selectedId;

    return {
        guests,
        selectedId,
        selectedGuest,
        handleSelectChange,
        addDialog,
        openAddDialog,
        closeAddDialog,
        submitGuest,
        handleAddGuest,
        isAdding: createMember.isPending || setAvatar.isPending,
        addError: createMember.error ?? setAvatar.error,
        photoPending: pendingPhotoMemberId !== null,
        handlePhotoChange,
        handleRemovePhoto,
        isSavingPhoto: (settingSelected && setAvatar.isPending) || (clearingSelected && clearAvatar.isPending),
        photoError: (settingSelected ? setAvatar.error : null) ?? (clearingSelected ? clearAvatar.error : null),
    };
}
