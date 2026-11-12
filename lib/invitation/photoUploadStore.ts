import { createStore, type StoreApi } from 'zustand/vanilla';

// The uploads in progress, by slot key (photoSlotKey). Only the slot being
// uploaded to listens to its own entry, so a progress tick never redraws the page.
export type PhotoUploadStatus = { percent: number };

export type PhotoUploadState = {
    uploads: Readonly<Record<string, PhotoUploadStatus>>;
    set: (key: string, status: PhotoUploadStatus) => void;
    clear: (key: string) => void;
};

export type PhotoUploadStore = StoreApi<PhotoUploadState>;

export function createPhotoUploadStore(): PhotoUploadStore {
    return createStore<PhotoUploadState>()((set) => ({
        uploads: {},
        set: (key, status) => set((state) => ({ uploads: { ...state.uploads, [key]: status } })),
        clear: (key) =>
            set((state) => {
                const { [key]: _done, ...rest } = state.uploads;
                return { uploads: rest };
            }),
    }));
}
