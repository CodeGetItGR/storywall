'use client';

import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CreateEventWizardButton } from '@/components/event/create/wizard/CreateEventWizardButton';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useContentLimits } from '@/hooks/useContentLimits';
import { useCreateEventWizardChangeEmail } from '@/hooks/useCreateEventWizardChangeEmail';
import type { useEmailCode } from '@/hooks/useEmailCode';

type Props = { emailCode: ReturnType<typeof useEmailCode>; onDone: () => void };

// A new address for the code: saves it, sends a code there, and goes back to the code screen.
export function AccountChangeEmail({ emailCode, onDone }: Props) {
    const t = useTranslations('CreateEventPage.wizard.code');
    const tRegister = useTranslations('RegisterPage');
    const limits = useContentLimits();
    const { email, handleEmailChange, handleSubmit } = useCreateEventWizardChangeEmail(emailCode, onDone);

    return (
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[28px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('changeEmail')}
            </h1>

            {/* Email */}
            <FormFieldLabel label={tRegister('fields.email')} required>
                <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                    <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted" />
                    <input
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={limits.emailMaxLength}
                        placeholder={tRegister('placeholders.email')}
                        value={email}
                        onChange={handleEmailChange}
                        className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                    />
                </div>
            </FormFieldLabel>
            {emailCode.error && (
                <p role="alert" className="-mt-2 text-sm text-red-600">
                    {emailCode.error}
                </p>
            )}

            {/* Confirm */}
            <CreateEventWizardButton type="submit" label={t('confirm')} pending={emailCode.isSending} disabled={emailCode.isSending} />
        </form>
    );
}
