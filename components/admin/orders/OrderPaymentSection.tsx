'use client';

import { ChevronDown, ExternalLink } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { AdminSection } from '@/components/admin/AdminSection';
import { OrderFactList } from '@/components/admin/orders/OrderFactList';
import { formatOptionalDateTime, stripePaymentUrl } from '@/lib/adminOrders';
import type { AdminOrderDetailDto } from '@/lib/api/types';

export function OrderPaymentSection({ payment }: { payment: AdminOrderDetailDto['payment'] }) {
    const t = useTranslations('AdminPage.orders');
    const locale = useLocale();
    const hasFraudSignals = Boolean(payment.cardFingerprint || payment.riskLevel);

    return (
        <AdminSection title={t('detail.sections.payment')}>
            <div className="space-y-4">
                {/* Facts */}
                <OrderFactList
                    facts={[
                        { key: 'provider', label: t('detail.payment.provider'), value: t(`provider.${payment.provider}`) },
                        { key: 'billingCountry', label: t('detail.payment.billingCountry'), value: payment.billingCountry, mono: true },
                        { key: 'cardCountry', label: t('detail.payment.cardCountry'), value: payment.cardCountry, mono: true },
                        {
                            key: 'disputedAt',
                            label: t('detail.payment.disputedAt'),
                            value: formatOptionalDateTime(locale, payment.disputedAt),
                            mono: true,
                        },
                        {
                            key: 'disputeClosedAt',
                            label: t('detail.payment.disputeClosedAt'),
                            value: formatOptionalDateTime(locale, payment.disputeClosedAt),
                            mono: true,
                        },
                    ]}
                />

                {/* Identifiers */}
                {(payment.providerPaymentId || payment.providerSessionId) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {payment.providerPaymentId && (
                            <div className="min-w-0 space-y-1">
                                <AdminIdentifier label={t('detail.payment.paymentId')} value={payment.providerPaymentId} hideValue />
                                {payment.provider === 'STRIPE' && (
                                    <a
                                        href={stripePaymentUrl(payment.providerPaymentId)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink hover:underline"
                                    >
                                        <ExternalLink className="h-3 w-3" aria-hidden />
                                        {t('detail.payment.openInStripe')}
                                    </a>
                                )}
                            </div>
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
        </AdminSection>
    );
}
