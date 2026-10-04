'use client';

import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminLimitControl } from '@/components/admin/AdminLimitControl';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useMemberRoleDrawer } from '@/hooks/useMemberRoleDrawer';
import type { Locale } from '@/i18n/config';
import { getErrorMessage } from '@/lib/api/errors';
import type { MemberRoleCatalogDto } from '@/lib/api/types';

const FORM_ID = 'member-role-form';

export function MemberRoleDrawer({
    role,
    eventTypeKey,
    eventTypeName,
    sortOrder,
    onCloseAction,
}: {
    role: MemberRoleCatalogDto | null;
    eventTypeKey: string;
    eventTypeName: string;
    sortOrder: number;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.memberRoles.drawer');
    const locale = useLocale() as Locale;
    const form = useMemberRoleDrawer({ role, eventTypeKey, sortOrder, onDoneAction: onCloseAction });
    const roleName = role ? role.label[locale] || role.label.en : '';
    const keyHint = form.failure?.kind === 'keyTaken' ? t('keyTaken') : form.errors.roleKey ? t('keyInvalid') : undefined;

    const footer = (
        <div className="flex items-center justify-between gap-2">
            {/* Retire or restore */}
            <div>
                {role && !role.retired && (
                    <button
                        type="button"
                        onClick={form.requestRetire}
                        className="h-9 rounded-md px-3 text-sm font-semibold text-status-danger hover:bg-canvas"
                    >
                        {t('retire')}
                    </button>
                )}
                {role?.retired && (
                    <button
                        type="button"
                        onClick={form.restore}
                        disabled={form.isRetiring}
                        className="h-9 rounded-md px-3 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
                    >
                        {t('restore')}
                    </button>
                )}
            </div>

            {/* Save */}
            <div className="flex gap-2">
                <button type="button" onClick={onCloseAction} className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink">
                    {t('cancel')}
                </button>
                <button
                    type="submit"
                    form={FORM_ID}
                    disabled={form.isSaving || form.failure?.kind === 'notFound'}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                    {form.isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('save')}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <AdminDrawer open onClose={onCloseAction} title={role ? roleName : t('createTitle')} closeLabel={t('close')} footer={footer}>
                <form id={FORM_ID} onSubmit={form.handleSubmit} className="space-y-4" noValidate>
                    {/* Error */}
                    {form.failure?.kind === 'notFound' && <p className="text-sm text-status-danger">{t('notFound')}</p>}
                    {form.failure?.kind === 'other' && <p className="text-sm text-status-danger">{getErrorMessage(form.failure.error)}</p>}

                    {/* Identity */}
                    <AdminField label={t('eventType')}>
                        <p className="text-sm text-ink">{eventTypeName}</p>
                    </AdminField>
                    <AdminField label={t('key')} required={form.isCreate} hint={keyHint}>
                        {form.isCreate ? (
                            <input
                                name="roleKey"
                                value={form.draft.roleKey}
                                onChange={form.handleFieldChange}
                                maxLength={50}
                                autoComplete="off"
                                aria-invalid={Boolean(keyHint)}
                                className={adminInputClass('font-mono')}
                            />
                        ) : (
                            <p className="font-mono text-sm text-ink">{form.draft.roleKey}</p>
                        )}
                    </AdminField>

                    {/* Labels */}
                    <AdminField label={t('labelEn')} required hint={form.errors.labelEn ? t('labelInvalid') : undefined}>
                        <input
                            name="labelEn"
                            value={form.draft.labelEn}
                            onChange={form.handleFieldChange}
                            maxLength={40}
                            aria-invalid={Boolean(form.errors.labelEn)}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('labelEl')} required hint={form.errors.labelEl ? t('labelInvalid') : undefined}>
                        <input
                            name="labelEl"
                            value={form.draft.labelEl}
                            onChange={form.handleFieldChange}
                            maxLength={40}
                            aria-invalid={Boolean(form.errors.labelEl)}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('emoji')} optional hint={form.errors.emoji ? t('emojiInvalid') : undefined}>
                        <input
                            name="emoji"
                            value={form.draft.emoji}
                            onChange={form.handleFieldChange}
                            aria-invalid={Boolean(form.errors.emoji)}
                            className={adminInputClass('w-24')}
                        />
                    </AdminField>

                    {/* Limit */}
                    <AdminLimitControl
                        label={t('limit')}
                        limited={form.draft.limited}
                        value={form.draft.maxHolders}
                        min={1}
                        error={form.errors.maxHolders ? t('limitInvalid') : undefined}
                        unlimitedLabel={t('unlimited')}
                        upToLabel={t('upTo')}
                        onModeChangeAction={form.handleLimitModeChange}
                        onValueChangeAction={form.handleLimitValueChange}
                    />

                    {/* Access */}
                    <div className="overflow-hidden rounded-md border border-border/70">
                        <AdminSwitch
                            label={t('hostOnly')}
                            description={t('hostOnlyHint')}
                            checked={form.draft.hostOnly}
                            onCheckedChangeAction={form.handleHostOnlyChange}
                        />
                    </div>
                </form>
            </AdminDrawer>

            {/* Retire confirmation */}
            <ConfirmActionModal
                open={form.confirmingRetire}
                onCloseAction={form.cancelRetire}
                title={t('retireTitle', { role: roleName })}
                body={t('retireBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('retireConfirm')}
                isConfirming={form.isRetiring}
                onConfirmAction={form.confirmRetire}
            />
        </>
    );
}
