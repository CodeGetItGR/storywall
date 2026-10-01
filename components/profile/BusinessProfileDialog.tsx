'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BusinessProfileFields } from '@/components/profile/BusinessProfileFields';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { BusinessProfileSettings } from '@/hooks/useBusinessProfile';

export function BusinessProfileDialog({ settings }: { settings: BusinessProfileSettings }) {
    const t = useTranslations('ProfilePage.business');

    return (
        <Modal open={settings.isEditing} onClose={settings.closeEditor} size="md" closeLabel={t('cancel')} showCloseButton={!settings.isSaving}>
            <Modal.Body className="px-4 pt-5 pb-4 sm:px-5">
                <form onSubmit={settings.handleSubmit} className="flex flex-col gap-5">
                    {/* Header */}
                    <div className="pr-10">
                        <h2 className="text-base font-semibold text-ink">{t('title')}</h2>
                        <p className="mt-1 text-sm text-ink-muted">{t('noWithdrawal')}</p>
                    </div>

                    {/* Fields */}
                    <BusinessProfileFields
                        form={settings.form}
                        fieldErrors={settings.fieldErrors}
                        countryOptions={settings.countryOptions}
                        onFieldChange={settings.handleFieldChange}
                    />

                    {/* Error */}
                    {settings.saveError && (
                        <p role="alert" className="text-sm text-red-600">
                            {settings.saveError}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {settings.profile ? (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={settings.askRemove}
                                disabled={settings.isSaving}
                                className="gap-2 rounded-full px-3 text-red-600"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                {t('remove')}
                            </Button>
                        ) : (
                            <span />
                        )}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={settings.closeEditor}
                                disabled={settings.isSaving}
                                className="rounded-full px-4"
                            >
                                {t('cancel')}
                            </Button>
                            <Button type="submit" disabled={settings.isSaving} className="gap-2 rounded-full px-4">
                                {settings.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {settings.isSaving ? t('saving') : t('save')}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
