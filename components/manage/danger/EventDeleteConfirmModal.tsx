'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { EventDeletionStep } from '@/hooks/useEventDeletionFlow';

export function EventDeleteConfirmModal({
    open,
    step,
    otpCode,
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
    open: boolean;
    step: EventDeletionStep;
    otpCode: string;
    onOtpChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
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
            title={t('settings.dangerZone.confirmTitle')}
            size="md"
            body={
                <div className="flex flex-col gap-3">
                    {/* Deletion explanation */}
                    <p>{isVerifyStep ? t('settings.dangerZone.otp.verifyBody') : t('settings.dangerZone.confirmBody')}</p>

                    {isVerifyStep && (
                        <>
                            {/* Verification code */}
                            <label className="flex flex-col gap-1.5 text-left">
                                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                                    {t('settings.dangerZone.otp.label')}
                                </span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={onOtpChangeAction}
                                    aria-invalid={otpInvalid}
                                    aria-describedby={otpInvalid ? 'event-delete-otp-error' : undefined}
                                    className="w-full rounded-xl bg-surface-muted px-3 py-2.5 font-mono text-base tracking-[0.3em] text-ink outline-none focus:ring-2 focus:ring-primary/30"
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
            confirmLabel={isVerifyStep ? t('settings.dangerZone.confirmAction') : sendCodeLabel}
            cancelLabel={t('settings.dangerZone.cancelAction')}
            onCloseAction={onCloseAction}
            onConfirmAction={isVerifyStep ? onConfirmAction : onSendCodeAction}
            isConfirming={isSendingCode || isDeleting}
            confirmDisabled={isVerifyStep ? otpCode.length !== 6 : resendDisabled}
        />
    );
}
