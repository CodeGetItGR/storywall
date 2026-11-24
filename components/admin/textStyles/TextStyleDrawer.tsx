'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { TextStyleChoice } from '@/components/admin/textStyles/TextStyleChoice';
import { INVITATION_FONT_CLASSES } from '@/components/saveMyDate/invitation/invitationFonts';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useTextStyleFontChoices } from '@/hooks/useTextStyleFontChoices';
import { useTextStylePresetDrawer } from '@/hooks/useTextStylePresetDrawer';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { TextStylePresetDto, TextStylePresetRequestDto } from '@/lib/api/types';
import { presetCss } from '@/lib/textStylePresets';
import { cn } from '@/lib/utils';

const FORM_ID = 'text-style-form';

export type TextStyleDrawerProps = {
    // null: a new preset.
    preset: TextStylePresetDto | null;
    isSaving: boolean;
    isDeleting: boolean;
    error: unknown;
    onSaveAction: (body: TextStylePresetRequestDto) => void;
    onDeleteAction: () => void;
    onCloseAction: () => void;
};

// One Style preset's form, in the console's right-side drawer.
export function TextStyleDrawer({ preset, isSaving, isDeleting, error, onSaveAction, onDeleteAction, onCloseAction }: TextStyleDrawerProps) {
    const t = useTranslations('AdminPage.textStyles');
    const tAdmin = useTranslations('AdminPage');
    const form = useTextStylePresetDrawer(preset);
    const fonts = useTextStyleFontChoices(form.draft.font);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const busy = isSaving || isDeleting;

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (form.valid && !busy) onSaveAction(form.body);
    }

    function handleTextChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = event.currentTarget;
        form.set({ [name]: value });
    }

    function handleNumberChange(event: ChangeEvent<HTMLInputElement>) {
        const { name, valueAsNumber } = event.currentTarget;
        form.set({ [name]: valueAsNumber });
    }

    function handleWeightChange(weight: TextStylePresetRequestDto['weight']) {
        form.set({ weight });
    }

    function handleItalicChange(italic: boolean) {
        form.set({ italic });
    }

    function handleCaseChange(value: 'normal' | 'upper') {
        form.set({ uppercase: value === 'upper' });
    }

    function openDeleteConfirm() {
        setConfirmingDelete(true);
    }

    function closeDeleteConfirm() {
        setConfirmingDelete(false);
    }

    const footer = (
        <div className="flex w-full items-center justify-between gap-2">
            {/* Delete */}
            {preset ? (
                <button
                    type="button"
                    onClick={openDeleteConfirm}
                    disabled={busy}
                    className="h-9 rounded-md px-3 text-sm font-semibold text-status-danger hover:bg-status-danger/10 disabled:opacity-50"
                >
                    {t('delete')}
                </button>
            ) : (
                <span />
            )}
            {/* Save */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onCloseAction}
                    disabled={busy}
                    className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
                >
                    {tAdmin('cancel')}
                </button>
                <button
                    type="submit"
                    form={FORM_ID}
                    disabled={!form.valid || busy}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {tAdmin('save')}
                </button>
            </div>
        </div>
    );

    return (
        <AdminDrawer
            open
            onClose={onCloseAction}
            closeDisabled={busy}
            title={preset ? preset.nameEn : t('create')}
            closeLabel={tAdmin('themeFonts.drawer.close')}
            footer={footer}
        >
            <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Error */}
                {error !== null && error !== undefined && (
                    <p role="alert" className="text-sm text-status-danger">
                        {tAdmin(`errors.${adminErrorMessageKey(error)}`)}
                    </p>
                )}

                {/* Names */}
                <div className="space-y-4">
                    <AdminField label={t('fields.nameEn')} required>
                        <input name="nameEn" value={form.draft.nameEn} onChange={handleTextChange} maxLength={80} className={adminInputClass()} />
                    </AdminField>
                    <AdminField label={t('fields.nameEl')} required>
                        <input name="nameEl" value={form.draft.nameEl} onChange={handleTextChange} maxLength={80} className={adminInputClass()} />
                    </AdminField>
                </div>

                {/* Look */}
                <div className="space-y-4">
                    <AdminField label={t('fields.font')} required>
                        <select name="font" value={form.draft.font} onChange={handleTextChange} className={adminInputClass()}>
                            <option value="" disabled hidden />
                            {fonts.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </AdminField>
                    <div className="grid grid-cols-2 gap-4">
                        <AdminField label={t('fields.size')} required>
                            <input
                                name="size"
                                type="number"
                                min={6}
                                max={400}
                                step={1}
                                value={Number.isFinite(form.draft.size) ? form.draft.size : ''}
                                onChange={handleNumberChange}
                                className={adminInputClass('font-mono')}
                            />
                        </AdminField>
                        <AdminField label={t('fields.letterSpacing')}>
                            <input
                                name="letterSpacing"
                                type="number"
                                min={-5}
                                max={50}
                                step={0.5}
                                value={Number.isFinite(form.draft.letterSpacing) ? form.draft.letterSpacing : ''}
                                onChange={handleNumberChange}
                                className={adminInputClass('font-mono')}
                            />
                        </AdminField>
                    </div>
                    <div className="flex flex-wrap gap-6">
                        <TextStyleChoice
                            label={t('fields.weight')}
                            options={[
                                { value: 'NORMAL', label: t('weight.normal') },
                                { value: 'BOLD', label: t('weight.bold') },
                            ]}
                            value={form.draft.weight}
                            onChangeAction={handleWeightChange}
                        />
                        <TextStyleChoice
                            label={t('fields.case')}
                            options={[
                                { value: 'normal', label: t('case.normal') },
                                { value: 'upper', label: t('case.upper') },
                            ]}
                            value={form.draft.uppercase ? 'upper' : 'normal'}
                            onChangeAction={handleCaseChange}
                        />
                    </div>
                    <div className="overflow-hidden rounded-lg border border-border">
                        <AdminSwitch label={t('fields.italic')} checked={form.draft.italic} onCheckedChangeAction={handleItalicChange} />
                    </div>
                </div>
            </form>

            {/* Preview */}
            <section aria-label={t('preview')} className="space-y-2">
                {fonts.fontFaces && <style>{fonts.fontFaces}</style>}
                <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('preview')}</p>
                <div className={cn('overflow-hidden rounded-lg border border-border bg-white px-4 py-6 text-center text-ink', INVITATION_FONT_CLASSES)}>
                    <p data-testid="text-style-sample" className="leading-tight break-words" style={presetCss(form.draft)}>
                        {form.draft.nameEn}
                    </p>
                </div>
            </section>

            {/* Delete confirmation */}
            <ConfirmActionModal
                open={confirmingDelete}
                title={t('deleteTitle')}
                body={t('deleteBody')}
                confirmLabel={t('delete')}
                cancelLabel={tAdmin('cancel')}
                isConfirming={isDeleting}
                onCloseAction={closeDeleteConfirm}
                onConfirmAction={onDeleteAction}
            />
        </AdminDrawer>
    );
}
