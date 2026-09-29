'use client';

import { UserPlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useId, useRef } from 'react';

import { DemoAddGuestModal } from '@/components/demo/DemoAddGuestModal';
import Avatar from '@/components/ui/avatar';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useDemoActAs } from '@/hooks/useDemoActAs';
import { useUploadAccept } from '@/hooks/useUploadAccept';
import { avatarColorFromId, initialsFromName } from '@/lib/utils';

// Shown to an admin filling a demo event: choose who new content is posted as.
export function DemoActAsBar({ eventId }: { eventId: string }) {
    const t = useTranslations('DemoActAs');
    const actAs = useDemoActAs(eventId);
    const selectId = useId();
    const photoInputRef = useRef<HTMLInputElement>(null);
    const uploadAccept = useUploadAccept();
    const toErrorMessage = useApiErrorMessage();
    const openPhotoPicker = useCallback(() => photoInputRef.current?.click(), []);

    return (
        <div className="sticky top-0 z-30 flex flex-wrap items-center gap-2 bg-ink px-4 py-2 text-sm text-white">
            {/* Posting as. Not one wrapping <label>: the photo buttons would act on it. */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <label htmlFor={selectId} className="shrink-0 font-semibold">
                    {t('postingAs')}
                </label>

                {/* Guest photo */}
                {actAs.selectedGuest && (
                    <span className="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={openPhotoPicker}
                            disabled={actAs.isSavingPhoto}
                            aria-label={t(actAs.selectedGuest.avatarUrl ? 'changePhotoFor' : 'addPhotoFor', {
                                name: actAs.selectedGuest.displayName,
                            })}
                            title={actAs.selectedGuest.avatarUrl ? t('changePhoto') : t('addPhoto')}
                            className="rounded-full ring-white/40 hover:ring-2 disabled:opacity-60"
                        >
                            <Avatar
                                size="sm"
                                src={actAs.selectedGuest.avatarUrl}
                                initials={initialsFromName(actAs.selectedGuest.displayName)}
                                color={avatarColorFromId(actAs.selectedGuest.id)}
                                alt={actAs.selectedGuest.displayName}
                            />
                        </button>
                        {actAs.selectedGuest.avatarUrl && (
                            <button
                                type="button"
                                onClick={actAs.handleRemovePhoto}
                                disabled={actAs.isSavingPhoto}
                                aria-label={t('removePhoto')}
                                title={t('removePhoto')}
                                className="rounded-full p-1 hover:bg-white/20 disabled:opacity-60"
                            >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        )}
                        <input
                            ref={photoInputRef}
                            type="file"
                            accept={uploadAccept.profilePicture}
                            onChange={actAs.handlePhotoChange}
                            className="hidden"
                        />
                    </span>
                )}

                <select
                    id={selectId}
                    value={actAs.selectedId ?? ''}
                    onChange={actAs.handleSelectChange}
                    className="min-h-9 max-w-64 min-w-0 flex-1 rounded-md bg-white/10 px-2 text-white [&>option]:text-ink"
                >
                    <option value="">{t('host')}</option>
                    {actAs.guests.map((guest) => (
                        <option key={guest.id} value={guest.id}>
                            {guest.displayName}
                        </option>
                    ))}
                </select>
            </div>

            {/* Add guest */}
            <button
                type="button"
                onClick={actAs.openAddDialog}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white/10 px-3 font-semibold hover:bg-white/20"
            >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {t('addGuest')}
            </button>
            {Boolean(actAs.photoError) && !actAs.addDialog.open && (
                <span role="alert" className="w-full text-xs text-rose-300">
                    {toErrorMessage(actAs.photoError)}
                </span>
            )}

            <DemoAddGuestModal
                open={actAs.addDialog.open}
                isAdding={actAs.isAdding}
                error={actAs.addError}
                photoPending={actAs.photoPending}
                onCloseAction={actAs.closeAddDialog}
                onSubmitAction={actAs.handleAddGuest}
            />
        </div>
    );
}
