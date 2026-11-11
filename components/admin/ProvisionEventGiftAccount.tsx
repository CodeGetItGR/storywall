'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useContentLimits } from '@/hooks/useContentLimits';
import type { ProvisionGiftAccountState } from '@/hooks/useProvisionGiftAccount';
import type { EventGiftAccountRequestDto } from '@/lib/api/types';

export function ProvisionEventGiftAccount({ giftAccount }: { giftAccount: ProvisionGiftAccountState }) {
    const t = useTranslations('AdminPage.accounts.provision');
    const tGifts = useTranslations('GiftsPage');
    const limits = useContentLimits();
    const { fields, isStarted } = giftAccount;

    function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        giftAccount.setField(event.currentTarget.name as keyof EventGiftAccountRequestDto, event.currentTarget.value);
    }

    return (
        <section aria-labelledby="provision-event-gift" className="space-y-4 border-t border-border pt-6">
            {/* Header */}
            <h3 id="provision-event-gift" className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                {t('giftSection')}
            </h3>

            {/* Account */}
            <AdminField label={tGifts('fields.iban')} required={isStarted} optional={!isStarted}>
                <input
                    name="iban"
                    required={isStarted}
                    maxLength={42}
                    value={fields.iban}
                    onChange={handleChange}
                    autoComplete="off"
                    className={adminInputClass('font-mono uppercase')}
                    aria-invalid={giftAccount.ibanError}
                />
                {giftAccount.ibanError ? <span className="text-xs text-status-danger">{tGifts('invalidIban')}</span> : null}
            </AdminField>
            <div className="grid gap-4 sm:grid-cols-2">
                <AdminField label={tGifts('fields.accountHolder')} required={isStarted} optional={!isStarted}>
                    <input
                        name="accountHolder"
                        required={isStarted}
                        maxLength={limits.giftAccountHolderMaxLength}
                        value={fields.accountHolder}
                        onChange={handleChange}
                        className={adminInputClass()}
                    />
                </AdminField>
                <AdminField label={tGifts('fields.bankName')} required={isStarted} optional={!isStarted}>
                    <input
                        name="bankName"
                        required={isStarted}
                        maxLength={limits.giftBankNameMaxLength}
                        value={fields.bankName}
                        onChange={handleChange}
                        className={adminInputClass()}
                    />
                </AdminField>
            </div>
            <AdminField label={tGifts('fields.note')}>
                <textarea
                    name="note"
                    rows={2}
                    maxLength={limits.giftNoteMaxLength}
                    value={fields.note}
                    onChange={handleChange}
                    className={adminInputClass()}
                />
            </AdminField>
        </section>
    );
}
