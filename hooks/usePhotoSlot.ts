'use client';

import { type ChangeEvent, type MouseEvent, useCallback, useRef } from 'react';
import { useStore } from 'zustand';

import { usePhotoUploadsContext } from '@/hooks/usePhotoUploadsContext';
import { type PhotoSlot, photoSlotKey } from '@/lib/invitation/photoSlots';
import { createPhotoUploadStore } from '@/lib/invitation/photoUploadStore';

// Without the editor's uploads there is nothing to listen to.
const IDLE_STORE = createPhotoUploadStore();

// One photo slot's camera: opens the file picker (or the sign-in pop-up), sends
// the picked file and tells how far its upload is.
export function usePhotoSlot(slot: PhotoSlot) {
    const slots = usePhotoUploadsContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const key = photoSlotKey(slot);
    const status = useStore(slots?.uploads ?? IDLE_STORE, (state) => state.uploads[key]);

    const pick = useCallback(
        (event: MouseEvent) => {
            // The camera sits inside the section: a tap must not select it too.
            event.stopPropagation();
            if (slots?.canPick()) inputRef.current?.click();
        },
        [slots],
    );

    const onFile = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            // The same file can be picked again after a failure.
            event.target.value = '';
            if (file) void slots?.upload(slot, file);
        },
        [slot, slots],
    );

    return { isAvailable: slots !== null, inputRef, pick, onFile, percent: status?.percent ?? null };
}
