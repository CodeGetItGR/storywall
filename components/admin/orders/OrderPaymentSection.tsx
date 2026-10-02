'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { OrderCard } from '@/components/admin/orders/OrderCard';
import { OrderFactList } from '@/components/admin/orders/OrderFactList';
import type { AdminOrderDetailDto } from '@/lib/api/types';

export function OrderPaymentSection({ payment }: { payment: AdminOrderDetailDto['payment'] }) {
    const t = useTranslations('AdminPage.orders');
    const hasFraudSignals = Boolean(payment.cardFingerprint || payment.riskLevel);

    return (
        <OrderCard title={t('detail.sections.payment')}>
            <div className="space-y-4">
                {/* Facts */}
                <OrderFactList
                    facts={[
                        { key: 'provider', label: t('detail.payment.provider'), value: t(`provider.${payment.provider}`) },
                        { key: 'billingCountry', label: t('detail.payment.billingCountry'), value: payment.billingCountry, mono: true },
                        { key: 'cardCountry', label: t('detail.payment.cardCountry'), value: payment.cardCountry, mono: true },
                    ]}
                />

                {/* Identifiers */}
                {(payment.providerPaymentId || payment.providerSessionId) && (
                    <div className="grid grid-cols-2 gap-3">
                        {payment.providerPaymentId && (
                            <AdminIdentifier label={t('detail.payment.paymentId')} value={payment.providerPaymentId} hideValue />
                        )}
                        {payment.providerSessionId && (
                            <AdminIdentifier label={t('detail.payment.sessionId')} value={payment.providerSessionId} hideValue />
                        )}
                    </div>
                )}

                {/* Fraud signals */}
                {hasFraudSignals && (
                    <details className="group">
                        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink [&::-webkit-details-marker]:hidden">
                            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
                            {t('detail.sections.fraud')}
                        </summary>
                        <div className="mt-3">
                            <OrderFactList
                                facts={[
                                    {
                                        key: 'cardFingerprint',
                                        label: t('detail.payment.cardFingerprint'),
                                        value: payment.cardFingerprint,
                                        mono: true,
                                    },
                                    { key: 'riskLevel', label: t('detail.payment.riskLevel'), value: payment.riskLevel, mono: true },
                                ]}
                            />
                        </div>
                    </details>
                )}
            </div>
        </OrderCard>
    );
}
