'use client';

import { useCreate, useDelete, useUpdate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { type ReactionTypeAvailability,ReactionTypeAvailabilityControl } from '@/components/admin/ReactionTypeAvailabilityControl';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { EventTypeConvention, ReactionTypeRequestDto, ReactionTypeResponseDto } from '@/lib/api/types';

function codeFromReactionName(name: string, takenCodes: string[]): string {
    const base = name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 20);

    if (!base) return 'REACTION';
    if (!takenCodes.includes(base)) return base;

    for (let suffix = 2; suffix < 100; suffix += 1) {
        const tail = `_${suffix}`;
        const candidate = `${base.slice(0, 20 - tail.length).replace(/_+$/, '')}${tail}`;
        if (!takenCodes.includes(candidate)) return candidate;
    }

    return `${base.slice(0, 14).replace(/_+$/, '')}_${Date.now().toString(36).toUpperCase()}`.slice(0, 20);
}

function inputFromForm(
    formData: FormData,
    eventTypeKey: EventTypeConvention,
    availability: ReactionTypeAvailability,
    takenCodes: string[],
    reactionType?: ReactionTypeResponseDto
): ReactionTypeRequestDto {
    const name = String(formData.get('name') ?? '').trim();
    return {
        eventTypeKey,
        code: reactionType?.code ?? codeFromReactionName(name, takenCodes),
        name,
        emoji: String(formData.get('emoji') ?? '').trim(),
        sortOrder: Number(formData.get('sortOrder') ?? 0),
        isAssignable: availability === 'AVAILABLE',
    };
}

export function ReactionTypeDrawer({
    open,
    eventTypeKey,
    reactionType,
    reactionTypes,
    onCloseAction,
}: {
    open: boolean;
    eventTypeKey: EventTypeConvention;
    reactionType: ReactionTypeResponseDto | null;
    reactionTypes: ReactionTypeResponseDto[];
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.reactionTypes');
    const tAdmin = useTranslations('AdminPage');
    const queryClient = useQueryClient();
    const [availability, setAvailability] = useState<ReactionTypeAvailability>(reactionType?.isAssignable === false ? 'ARCHIVED' : 'AVAILABLE');
    const [deleteOpen, setDeleteOpen] = useState(false);

    const invalidateCatalogs = () => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'reaction-types'] });
        queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
    };
    const { mutateAsync: createReactionType, mutation: createMutation } = useCreate<ReactionTypeResponseDto>({
        dataProviderName: 'reaction-types',
        mutationOptions: { onSuccess: invalidateCatalogs },
    });
    const { mutateAsync: updateReactionType, mutation: updateMutation } = useUpdate<ReactionTypeResponseDto>({
        dataProviderName: 'reaction-types',
        mutationOptions: { onSuccess: invalidateCatalogs },
    });
    const { mutateAsync: deleteReactionType, mutation: deleteMutation } = useDelete<ReactionTypeResponseDto>();
    const mutation = reactionType ? updateMutation : createMutation;

    async function submit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const input = inputFromForm(
            new FormData(event.currentTarget),
            eventTypeKey,
            availability,
            reactionTypes.map((item) => item.code),
            reactionType ?? undefined
        );

        if (reactionType) {
            const { code: _code, eventTypeKey: _eventTypeKey, ...patch } = input;
            await updateReactionType({ resource: 'reaction-types', id: reactionType.id, values: patch, dataProviderName: 'reaction-types' });
        } else {
            await createReactionType({ resource: 'reaction-types', values: input, dataProviderName: 'reaction-types' });
        }
        onCloseAction();
    }

    async function confirmDelete() {
        if (!reactionType) return;
        await deleteReactionType({ resource: 'reaction-types', id: reactionType.id, dataProviderName: 'reaction-types' });
        invalidateCatalogs();
        onCloseAction();
    }

    function openDeleteConfirmation() {
        setDeleteOpen(true);
    }

    function closeDeleteConfirmation() {
        setDeleteOpen(false);
    }

    return (
        <>
            <AdminDrawer
                open={open}
                onClose={onCloseAction}
                closeLabel={tAdmin('cancel')}
                title={reactionType ? t('editTitle', { name: reactionType.name }) : t('createTitle')}
                subtitle={eventTypeKey}
                footer={
                    <>
                        <div>
                            {reactionType && (
                                <button
                                    type="button"
                                    onClick={openDeleteConfirmation}
                                    className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-status-danger hover:bg-status-danger-wash"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {t('delete')}
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onCloseAction}
                                className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                            >
                                {tAdmin('cancel')}
                            </button>
                            <button
                                type="submit"
                                form="reaction-type-form"
                                disabled={mutation.isPending}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                {reactionType ? t('save') : t('create')}
                            </button>
                        </div>
                    </>
                }
            >
                <form id="reaction-type-form" onSubmit={submit} className="space-y-5">
                    {/* Identity */}
                    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
                        <AdminField label={t('fields.emoji')} required>
                            <input
                                name="emoji"
                                required
                                maxLength={16}
                                defaultValue={reactionType?.emoji}
                                className={adminInputClass('text-center text-xl')}
                            />
                        </AdminField>
                        <AdminField label={t('fields.name')} required>
                            <input name="name" required maxLength={30} defaultValue={reactionType?.name} className={adminInputClass()} />
                        </AdminField>
                    </div>

                    {/* Ordering */}
                    <AdminField label={t('fields.sortOrder')} required>
                        <input
                            name="sortOrder"
                            type="number"
                            required
                            min={0}
                            defaultValue={reactionType?.sortOrder ?? reactionTypes.length}
                            className={adminInputClass()}
                        />
                    </AdminField>

                    {reactionType && (
                        <div className="rounded-lg bg-canvas px-3 py-2">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{t('fields.code')}</p>
                            <p className="mt-1 font-mono text-sm text-ink">{reactionType.code}</p>
                        </div>
                    )}

                    {/* Availability */}
                    <ReactionTypeAvailabilityControl
                        title={t('fields.availability')}
                        value={availability}
                        onChangeAction={setAvailability}
                        labels={{ AVAILABLE: t('fields.available'), ARCHIVED: t('fields.archived') }}
                        hints={{ AVAILABLE: t('fields.availableHint'), ARCHIVED: t('fields.archivedHint') }}
                    />

                    {mutation.error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(mutation.error)}`)}</p>}
                </form>
            </AdminDrawer>

            <ConfirmActionModal
                open={deleteOpen}
                onCloseAction={closeDeleteConfirmation}
                title={t('deleteConfirmTitle', { name: reactionType?.name ?? '' })}
                body={t('deleteConfirmBody')}
                cancelLabel={tAdmin('cancel')}
                confirmLabel={t('delete')}
                onConfirmAction={confirmDelete}
                isConfirming={deleteMutation.isPending}
                icon={<Trash2 className="h-5 w-5" />}
            />
        </>
    );
}
