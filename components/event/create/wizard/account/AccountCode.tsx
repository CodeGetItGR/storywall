'use client';

import { MailCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SubmitEvent } from 'react';

import { EmailCodeInput } from '@/components/event/create/wizard/account/EmailCodeInput';
import { CreateEventWizardButton } from '@/components/event/create/wizard/CreateEventWizardButton';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import type { useEmailCode } from '@/hooks/useEmailCode';
import { EMAIL_CODE_LENGTH, formatCountdown } from '@/lib/emailCode';

type Props = { emailCode: ReturnType<typeof useEmailCode>; onChangeEmail: () => void };

// The 6-digit code screen: the code, resend with its countdown, change email, confirm.
export function AccountCode({ emailCode, onChangeEmail }: Props) {
    const t = useTranslations('CreateEventPage.wizard.code');
    const { code, setCode, verify, resend, secondsLeft, resent, isVerifying, isSending, errorKey, error, email } = emailCode;
    const message = errorKey ? t(`errors.${errorKey}`) : error;

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (code.length === EMAIL_CODE_LENGTH) void verify(code);
    }

    function handleComplete(value: string) {
        void verify(value);
    }

    function handleResend() {
        void resend();
    }

    return (
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {/* Heading */}
            <div className="flex flex-col items-start gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-[#fbf1e6] text-ink">
                    <MailCheck aria-hidden="true" className="size-6" />
                </span>
                <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[28px] leading-[1.15] tracking-[-0.02em] text-ink">
                    {t('heading')}
                </h1>
                <p className="text-[15px] text-[#6f6257]">{t('line', { email })}</p>
            </div>

            {/* Code */}
            <EmailCodeInput
                label={t('label')}
                value={code}
                onChange={setCode}
                onComplete={handleComplete}
                disabled={isVerifying}
                invalid={Boolean(errorKey)}
            />
            {message && (
                <p role="alert" className="-mt-2 text-sm text-red-600">
                    {message}
                </p>
            )}
            {resent && !message && <p className="-mt-2 text-sm text-[#6f6257]">{t('resent')}</p>}

            {/* Links */}
            <div className="flex items-center justify-between text-sm font-semibold">
                <button
                    type="button"
                    disabled={secondsLeft > 0 || isSending}
                    onClick={handleResend}
                    className="text-ink focus-ring disabled:text-[#9a8c80]"
                >
                    {secondsLeft > 0 ? t('resendIn', { time: formatCountdown(secondsLeft) }) : t('resend')}
                </button>
                <button type="button" onClick={onChangeEmail} className="text-ink underline-offset-4 focus-ring hover:underline">
                    {t('changeEmail')}
                </button>
            </div>

            {/* Confirm */}
            <CreateEventWizardButton
                type="submit"
                label={t('confirm')}
                pending={isVerifying}
                disabled={isVerifying || code.length < EMAIL_CODE_LENGTH}
            />
        </form>
    );
}
