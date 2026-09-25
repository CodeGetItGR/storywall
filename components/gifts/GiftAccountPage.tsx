'use client';

import { Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { GiftAccountDetails } from '@/components/gifts/GiftAccountDetails';
import { GiftAccountForm } from '@/components/gifts/GiftAccountForm';
import { GiftAccountSetupForm } from '@/components/gifts/GiftAccountSetupForm';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ModuleUnavailableState } from '@/components/tools/ModuleUnavailableState';
import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useGiftAccount } from '@/hooks/useGiftAccount';
import { useGiftAccountEditor } from '@/hooks/useGiftAccountEditor';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { usePlanUpgradeHref } from '@/hooks/usePlanUpgradeHref';
import { routes } from '@/lib/routes';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

export function GiftAccountPage() {
    const t = useTranslations('GiftsPage');
    const event = useActiveEvent();
    const eventId = event?.id ?? '';
    const isHost = useIsHost();
    const account = useGiftAccount(event?.id ?? null);
    const editor = useGiftAccountEditor(eventId);
    const wishlistReadable = useModuleReadable(event?.id ?? null, 'wishlist');
    const upgradeHref = usePlanUpgradeHref(eventId);

    const isLoaded = !account.isLoading && !account.error;
    const canEdit = isHost && Boolean(event?.id);

    if (event && !wishlistReadable) {
        return (
            <ModuleUnavailableState
                backHref={routes.events.feed(event.id)}
                backLabel={t('goBack')}
                body={t('unavailableBody')}
                icon={Gift}
                iconClassName="text-rose-500"
                title={t('unavailableTitle')}
                upgradeHref={upgradeHref}
            />
        );
    }

    // Header
    return (
        <ModulePageShell
            maxWidth="xl"
            title={t('accountTitle')}
            icon={Gift}
            iconClassName="text-rose-500"
            showTitleIcon={false}
            backLabel={t('goBack')}
            backHref={routes.events.feed(eventId)}
            className="pb-0 lg:pb-0"
        >
            {/* Details */}
            {isLoaded && account.data && !editor.isEditing && (
                <GiftAccountDetails account={account.data} onEditAction={canEdit ? editor.startEditing : undefined} />
            )}

            {/* Edit */}
            {isLoaded && account.data && canEdit && editor.isEditing && (
                <GiftAccountForm
                    account={account.data}
                    onSubmitAction={editor.submit}
                    isSaving={editor.isSaving}
                    invalidIban={editor.invalidIban}
                    onCancelAction={editor.stopEditing}
                    onRemoveAction={editor.openRemove}
                    className="pt-4 pb-8"
                />
            )}

            {/* Setup */}
            {isLoaded && !account.data && canEdit && (
                <GiftAccountSetupForm onSubmitAction={editor.submit} isSaving={editor.isSaving} invalidIban={editor.invalidIban} />
            )}

            {/* Empty */}
            {isLoaded && !account.data && !canEdit && (
                <ToolEmptyState
                    title={t('emptyTitle')}
                    body={t('emptyMember')}
                    iconSrc="/icons/present.svg"
                    iconFrame="plain"
                    iconAreaClassName="h-28 w-28"
                    className="flex min-h-[calc(100dvh-7.5rem)] flex-col justify-center pt-16"
                />
            )}

            {account.isLoading && <LoadingState label={t('loading')} className="py-16" />}
            {account.error && <p className="py-16 text-center text-sm text-rose-600">{t('loadError')}</p>}

            {/* Remove confirmation */}
            <ConfirmActionModal
                open={editor.removeOpen}
                onCloseAction={editor.closeRemove}
                onConfirmAction={editor.confirmRemove}
                title={t('removeTitle')}
                body={t('removeBody')}
                confirmLabel={t('remove')}
                cancelLabel={t('cancel')}
                isConfirming={editor.isRemoving}
            />
        </ModulePageShell>
    );
}
