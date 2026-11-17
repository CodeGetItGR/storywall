'use client';

import { useTranslations } from 'next-intl';

import { CodeInput } from '@/components/ui/CodeInput';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { EventDeletionStep } from '@/hooks/useEventDeletionFlow';

export function EventDeleteConfirmModal({
    draft = false,
    open,
    step,
    otpCode,
    codeDigits,
    onOtpChangeAction,
    otpInvalid,
    deleteError,
    resendSeconds,
    isSendingCode,
    isDeleting,
    onCloseAction,
    onSendCodeAction,
    onConfirmAction,
}: {
    // A draft has no guests or content yet, so it gets its own wording.
    draft?: boolean;
    open: boolean;
    step: EventDeletionStep;
    otpCode: string;
    codeDigits: number;
    onOtpChangeAction: (value: string) => void;
    otpInvalid: boolean;
    deleteError: string | null;
    resendSeconds: number;
    isSendingCode: boolean;
    isDeleting: boolean;
    onCloseAction: () => void;
    onSendCodeAction: () => void;
    onConfirmAction: () => void;
}) {
    const t = useTranslations('ManagePage');
    const isVerifyStep = step === 'verify';
    const resendDisabled = isSendingCode || resendSeconds > 0;
    const sendCodeLabel = resendSeconds > 0 ? t('settings.dangerZone.otp.resendIn', { seconds: resendSeconds }) : t('settings.dangerZone.otp.send');

    return (
        <ConfirmActionModal
            open={open}
            title={draft ? t('draft.delete.title') : t('settings.dangerZone.confirmTitle')}
            size="md"
            body={
                <div className="flex flex-col gap-3">
                    {/* Deletion explanation */}
                    <p>{isVerifyStep ? t('settings.dangerZone.otp.verifyBody', { digits: codeDigits }) : draft ? t('draft.delete.body') : t('settings.dangerZone.confirmBody')}</p>

                    {isVerifyStep && (
                        <>
                            {/* Verification code */}
                            <label className="flex flex-col gap-1.5 text-left">
                                <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                                    {t('settings.dangerZone.otp.label')}
                                </span>
                                <CodeInput
                                    length={codeDigits}
                                    value={otpCode}
                                    onChange={onOtpChangeAction}
                                    invalid={otpInvalid}
                                    describedBy={otpInvalid ? 'event-delete-otp-error' : undefined}
                                />
                                {otpInvalid && (
                                    <span id="event-delete-otp-error" role="alert" className="text-xs text-rose-600">
                                        {t('settings.dangerZone.otp.errors.invalid')}
                                    </span>
                                )}
                            </label>

                            {/* Resend code */}
                            <button
                                type="button"
                                onClick={onSendCodeAction}
                                disabled={resendDisabled}
                                className="self-start text-xs font-semibold text-primary transition-colors hover:text-primary-dark disabled:cursor-not-allowed disabled:text-ink-faint"
                            >
                                {isSendingCode
                                    ? t('settings.dangerZone.otp.sending')
                                    : resendSeconds > 0
                                      ? t('settings.dangerZone.otp.resendIn', { seconds: resendSeconds })
                                      : t('settings.dangerZone.otp.resend')}
                            </button>
                        </>
                    )}

                    {deleteError && (
                        <p role="alert" className="text-xs text-rose-600">
                            {deleteError}
                        </p>
                    )}
                </div>
            }
            confirmLabel={isVerifyStep ? (draft ? t('draft.delete.action') : t('settings.dangerZone.confirmAction')) : sendCodeLabel}
            cancelLabel={t('settings.dangerZone.cancelAction')}
            onCloseAction={onCloseAction}
            onConfirmAction={isVerifyStep ? onConfirmAction : onSendCodeAction}
            isConfirming={isSendingCode || isDeleting}
            confirmDisabled={isVerifyStep ? otpCode.length !== codeDigits : resendDisabled}
        />
    );
}
