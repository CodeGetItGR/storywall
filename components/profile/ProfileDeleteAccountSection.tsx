'use client';

import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAccountDeletionFlow } from '@/hooks/useAccountDeletionFlow';
import { useMe } from '@/hooks/useMe';
import { routes } from '@/lib/routes';

// "Delete account" — emailed-code confirmation, POST /api/me/deletion-requests.
// Admins can't delete themselves (4021), so they get the explanation instead of the button.
export function ProfileDeleteAccountSection() {
    const t = useTranslations('ProfilePage.deleteAccount');
    const { data: me } = useMe();
    const flow = useAccountDeletionFlow();
    if (!me || me.isGuestAccount) return null;

    const isAdmin = me.platformRole === 'ADMIN';
    const isVerifyStep = flow.step === 'verify';
    const resendDisabled = flow.isSendingCode || flow.resendSeconds > 0;
    const sendCodeLabel = flow.resendSeconds > 0 ? t('otp.resendIn', { seconds: flow.resendSeconds }) : t('otp.send');

    return (
        <section className="rounded-[1.5rem] bg-card p-4 shadow-[0_18px_48px_rgba(35,28,22,0.08)] sm:p-5">
            {/* Delete account header */}
            <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />
                <h2 className="text-base font-semibold text-ink">{t('title')}</h2>
            </div>

            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                <p className="text-xs leading-relaxed text-rose-700/80">{isAdmin ? t('adminBody') : t('body')}</p>
                {!isAdmin && (
                    <button
                        type="button"
                        onClick={flow.openConfirm}
                        className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        {t('action')}
                    </button>
                )}
            </div>

            <ConfirmActionModal
                open={flow.confirmOpen}
                title={t('confirmTitle')}
                size="md"
                body={
                    <div className="flex flex-col gap-3">
                        <p>{isVerifyStep ? t('otp.verifyBody', { digits: flow.codeDigits }) : t('confirmBody')}</p>

                        {/* Events that must be resolved first (5124) */}
                        {flow.blockingEvents && (
                            <div role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-left text-xs text-rose-700">
                                <p>{t('blocked')}</p>
                                <ul className="mt-2 flex flex-col gap-1">
                                    {flow.blockingEvents.map((event) => (
                                        <li key={event.eventId}>
                                            <Link
                                                href={routes.events.manage(event.eventId, { tab: 'danger' })}
                                                className="font-semibold underline underline-offset-2"
                                            >
                                                {event.title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {isVerifyStep && (
                            <>
                                {/* Verification code */}
                                <label className="flex flex-col gap-1.5 text-left">
                                    <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('otp.label')}</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        pattern="[0-9]*"
                                        maxLength={flow.codeDigits}
                                        value={flow.otpCode}
                                        onChange={flow.handleOtpChange}
                                        aria-invalid={flow.otpInvalid}
                                        aria-describedby={flow.otpInvalid ? 'account-delete-otp-error' : undefined}
                                        className="w-full rounded-xl bg-surface-muted px-3 py-2.5 font-mono text-base tracking-[0.3em] text-ink outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                    {flow.otpInvalid && (
                                        <span id="account-delete-otp-error" role="alert" className="text-xs text-rose-600">
                                            {t('otp.errors.invalid')}
                                        </span>
                                    )}
                                </label>

                                {/* Resend code */}
                                <button
                                    type="button"
                                    onClick={flow.sendOtp}
                                    disabled={resendDisabled}
                                    className="self-start text-xs font-semibold text-primary transition-colors hover:text-primary-dark disabled:cursor-not-allowed disabled:text-ink-faint"
                                >
                                    {flow.isSendingCode
                                        ? t('otp.sending')
                                        : flow.resendSeconds > 0
                                          ? t('otp.resendIn', { seconds: flow.resendSeconds })
                                          : t('otp.resend')}
                                </button>
                            </>
                        )}

                        {flow.deleteError && (
                            <p role="alert" className="text-xs text-rose-600">
                                {flow.deleteError}
                            </p>
                        )}
                    </div>
                }
                confirmLabel={isVerifyStep ? t('confirmAction') : sendCodeLabel}
                cancelLabel={t('cancel')}
                onCloseAction={flow.closeConfirm}
                onConfirmAction={isVerifyStep ? flow.confirmDelete : flow.sendOtp}
                isConfirming={flow.isSendingCode || flow.isDeleting}
                confirmDisabled={isVerifyStep ? flow.otpCode.length !== flow.codeDigits : resendDisabled || Boolean(flow.blockingEvents)}
            />
        </section>
    );
}
