'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { CollaboratorBrandingImageField } from '@/components/admin/collaborations/CollaboratorBrandingImageField';
import { CollaboratorBrandingPreview } from '@/components/admin/collaborations/CollaboratorBrandingPreview';
import { useCollaboratorBrandingDrawer } from '@/hooks/useCollaboratorBranding';
import { useCollaboratorBrandingPreview } from '@/hooks/useCollaboratorBrandingPreview';
import { BRANDING_LINE_MAX, BRANDING_NAME_MAX, PARTNER_ROLES } from '@/lib/adminPartnerBranding';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export function CollaboratorBrandingDrawer({
    open,
    collaborator,
    onCloseAction,
}: {
    open: boolean;
    collaborator: CollaboratorResponseDto;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.collaborations.feedCard');
    const tAdmin = useTranslations('AdminPage');
    const drawer = useCollaboratorBrandingDrawer(collaborator, onCloseAction);
    const preview = useCollaboratorBrandingPreview(collaborator);

    return (
        <AdminDrawer
            open={open}
            onClose={drawer.handleClose}
            closeDisabled={drawer.isSaving}
            closeLabel={tAdmin('cancel')}
            title={t('drawerTitle', { name: collaborator.name })}
            size="wide"
            footer={
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={drawer.handleClose}
                        className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                    >
                        {tAdmin('cancel')}
                    </button>
                    <button
                        type="submit"
                        form="collaborator-branding-form"
                        disabled={drawer.isSaving}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {drawer.isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {tAdmin('save')}
                    </button>
                </div>
            }
        >
            <div className="space-y-7">
                {/* Text */}
                <form
                    id="collaborator-branding-form"
                    onSubmit={drawer.handleSubmit}
                    onChange={preview.handleFormChange}
                    noValidate
                    className="space-y-4"
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <AdminField label={t('fields.display_name')}>
                            <input
                                name="displayName"
                                maxLength={BRANDING_NAME_MAX}
                                defaultValue={collaborator.brandingDisplayName ?? ''}
                                className={adminInputClass()}
                            />
                        </AdminField>
                        <AdminField label={t('fields.role')}>
                            <select name="role" defaultValue={collaborator.brandingRole ?? ''} className={adminInputClass()}>
                                <option value="">{t('noRole')}</option>
                                {PARTNER_ROLES.map((role) => (
                                    <option key={role} value={role}>
                                        {t(`roles.${role}`)}
                                    </option>
                                ))}
                            </select>
                        </AdminField>
                    </div>
                    <AdminField label={t('fields.tagline_el')}>
                        <input
                            name="taglineEl"
                            maxLength={BRANDING_LINE_MAX}
                            defaultValue={collaborator.brandingTaglineEl ?? ''}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('fields.tagline_en')}>
                        <input
                            name="taglineEn"
                            maxLength={BRANDING_LINE_MAX}
                            defaultValue={collaborator.brandingTaglineEn ?? ''}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('fields.services_el')}>
                        <input
                            name="servicesEl"
                            maxLength={BRANDING_LINE_MAX}
                            defaultValue={collaborator.brandingServicesEl ?? ''}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('fields.services_en')}>
                        <input
                            name="servicesEn"
                            maxLength={BRANDING_LINE_MAX}
                            defaultValue={collaborator.brandingServicesEn ?? ''}
                            className={adminInputClass()}
                        />
                    </AdminField>

                    {/* Save error */}
                    {drawer.saveError && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(drawer.saveError)}`)}</p>}
                </form>

                {/* Images: saved as soon as they are picked */}
                <fieldset className="space-y-4">
                    <legend className="mb-3 text-sm font-semibold text-ink">{t('groups.images')}</legend>
                    <CollaboratorBrandingImageField collaborator={collaborator} kind="logo" />
                    <CollaboratorBrandingImageField collaborator={collaborator} kind="cover" />
                </fieldset>

                {/* Preview */}
                <CollaboratorBrandingPreview content={preview.content} locale={preview.locale} onLocaleChangeAction={preview.setLocale} />
            </div>
        </AdminDrawer>
    );
}
