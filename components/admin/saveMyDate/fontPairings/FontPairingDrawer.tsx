'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { EventTypeChecklist } from '@/components/admin/saveMyDate/EventTypeChecklist';
import { FontPairingPreview } from '@/components/admin/saveMyDate/fontPairings/FontPairingPreview';
import { InvitationThemeSegmented } from '@/components/admin/saveMyDate/themes/InvitationThemeSegmented';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { type FontPairingVisibility, useFontPairingDrawer } from '@/hooks/useFontPairingDrawer';
import type { EventTypeOption } from '@/hooks/useInvitationThemesCatalog';
import { type AdminFontPairingDto, FONT_PAIRING_NAME_MAX } from '@/lib/adminFontPairings';
import type { FontOption } from '@/lib/invitation/textEditing';

const FORM_ID = 'font-pairing-form';
const FONT_FIELDS = ['titleFont', 'bodyFont', 'buttonFont'] as const;
const FONT_LABEL = { titleFont: 'title', bodyFont: 'body', buttonFont: 'button' } as const;

export function FontPairingDrawer({
    pairing,
    eventTypes,
    onCloseAction,
}: {
    pairing: AdminFontPairingDto | null;
    eventTypes: EventTypeOption[];
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.saveMyDate.fontPairings');
    const tSaveMyDate = useTranslations('AdminPage.saveMyDate');
    const tDrawer = useTranslations('AdminPage.invitationThemes.drawer');
    const tStatus = useTranslations('AdminPage.invitationThemes.status');
    const apiErrorMessage = useApiErrorMessage();
    const form = useFontPairingDrawer({ pairing, onDoneAction: onCloseAction });
    const visibilityOptions: { value: FontPairingVisibility; label: string }[] = [
        { value: 'SHOWN', label: t('shown') },
        { value: 'HIDDEN', label: tStatus('HIDDEN') },
    ];

    const footer = (
        <div className="flex w-full items-center justify-end gap-2">
            {/* Save */}
            <button
                type="button"
                onClick={onCloseAction}
                disabled={form.isSaving}
                className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
            >
                {tDrawer('cancel')}
            </button>
            <button
                type="submit"
                form={FORM_ID}
                disabled={form.isSaving}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
            >
                {form.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {tDrawer('save')}
            </button>
        </div>
    );

    return (
        <AdminDrawer
            open
            size="wide"
            onClose={onCloseAction}
            closeDisabled={form.isSaving}
            title={pairing ? pairing.name : t('create')}
            closeLabel={tDrawer('close')}
            footer={footer}
        >
            <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
                <form id={FORM_ID} onSubmit={form.handleSubmit} className="space-y-4" noValidate>
                    {/* Error */}
                    {form.failure !== null && (
                        <p role="alert" className="text-sm text-status-danger">
                            {apiErrorMessage(form.failure)}
                        </p>
                    )}

                    {/* Name */}
                    <AdminField label={tDrawer('name')} required hint={form.errors.name ? t('nameInvalid') : undefined}>
                        <input
                            name="name"
                            value={form.draft.name}
                            onChange={form.handleNameChange}
                            maxLength={FONT_PAIRING_NAME_MAX}
                            autoComplete="off"
                            aria-invalid={Boolean(form.errors.name)}
                            className={adminInputClass()}
                        />
                    </AdminField>

                    {/* Fonts */}
                    <div className="space-y-4">
                        {FONT_FIELDS.map((field) => (
                            <AdminField key={field} label={t(`fonts.${FONT_LABEL[field]}`)} required={field !== 'buttonFont'}>
                                <FontSelect
                                    name={field}
                                    value={form.selectedFont[field]}
                                    options={form.fontOptions}
                                    emptyLabel={field === 'buttonFont' ? t('sameAsText') : null}
                                    onChangeAction={form.handleFontChange}
                                />
                            </AdminField>
                        ))}
                    </div>

                    {/* Event types */}
                    <EventTypeChecklist
                        legend={tSaveMyDate('eventTypes')}
                        hint={tSaveMyDate('eventTypesHint')}
                        options={eventTypes}
                        value={form.draft.eventTypes}
                        onChangeAction={form.handleEventTypeChange}
                    />

                    {/* Status and order */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{tDrawer('status')}</p>
                            <InvitationThemeSegmented
                                label={tDrawer('status')}
                                options={visibilityOptions}
                                value={form.visibility}
                                onChangeAction={form.handleVisibilityChange}
                                fill
                            />
                        </div>
                        <AdminField label={tDrawer('sortOrder')}>
                            <input
                                name="sortOrder"
                                type="number"
                                inputMode="numeric"
                                step={1}
                                value={form.draft.sortOrder}
                                onChange={form.handleSortOrderChange}
                                className={adminInputClass('font-mono')}
                            />
                        </AdminField>
                    </div>
                </form>

                {/* Preview */}
                <FontPairingPreview
                    titleFont={form.draft.titleFont}
                    bodyFont={form.draft.bodyFont}
                    buttonFont={form.previewButtonFont}
                    fontFaceCss={form.previewCss}
                />
            </div>
        </AdminDrawer>
    );
}

function FontSelect({
    name,
    value,
    options,
    emptyLabel,
    onChangeAction,
}: {
    name: string;
    value: string;
    options: FontOption[];
    // Set when the select may be left empty: the label of that choice.
    emptyLabel: string | null;
    onChangeAction: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
    return (
        <select name={name} value={value} onChange={onChangeAction} className={adminInputClass()}>
            {emptyLabel !== null && <option value="">{emptyLabel}</option>}
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
