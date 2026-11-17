'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useId } from 'react';

import { SlugStatus } from '@/components/saveMyDate/editor/publish/SlugStatus';
import { Modal } from '@/components/ui/modal';
import type { PublishSheetState } from '@/hooks/usePublishInvitation';

type PublishSheetProps = {
    sheet: PublishSheetState;
    // The host guests open the link on, shown in front of the field.
    inviteHost: string;
};

// The first publish: the host picks the invitation's link, then publishes.
export function PublishSheet({ sheet, inviteHost }: PublishSheetProps) {
    const t = useTranslations('InvitationEditor');
    const fieldId = useId();
    const statusId = useId();
    const noteId = useId();
    const isRefused = sheet.check === 'taken' || sheet.check === 'reserved' || sheet.check === 'invalid';
    const { setValue } = sheet;
    const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value.toLowerCase()), [setValue]);

    return (
        <Modal
            open={sheet.open}
            onClose={sheet.close}
            variant="sheet"
            size="sm"
            ariaLabel={t('publishTitle')}
            closeLabel={t('close')}
            closeDisabled={sheet.isPublishing}
        >
            <Modal.Body className="px-5 pt-5 pb-8 text-sm text-ink">
                <form onSubmit={sheet.submit} noValidate className="flex flex-col gap-4">
                    {/* Title */}
                    <h2 className="pr-10 text-base font-semibold">{t('publishTitle')}</h2>

                    {/* Link */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor={fieldId} className="font-medium">
                            {t('publishLink')}
                        </label>
                        <div className="flex h-11 items-center overflow-hidden rounded-xl border border-border bg-white focus-within:ring-2 focus-within:ring-primary">
                            <span className="shrink-0 pl-3 font-mono text-[13px] text-ink-muted" aria-hidden="true">
                                {inviteHost}/
                            </span>
                            <input
                                id={fieldId}
                                value={sheet.value}
                                onChange={onChange}
                                autoComplete="off"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                maxLength={60}
                                aria-invalid={isRefused || undefined}
                                aria-describedby={`${statusId} ${noteId}`}
                                className="h-full min-w-0 flex-1 bg-transparent pr-3 font-mono text-[13px] text-ink outline-none"
                            />
                        </div>
                        <SlugStatus id={statusId} check={sheet.check} />
                        <p id={noteId} className="text-ink-muted">
                            {t('publishLinkNote')}
                        </p>
                    </div>

                    {/* Failure */}
                    {sheet.failed && (
                        <p role="alert" className="font-medium text-rose-700">
                            {t('publishFailed')}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={sheet.close}
                            disabled={sheet.isPublishing}
                            className="rounded-full bg-surface-muted px-4 py-2 font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-60"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!sheet.canSubmit}
                            className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {t('publish')}
                        </button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
